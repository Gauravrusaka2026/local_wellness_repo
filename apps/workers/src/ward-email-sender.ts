import type { Database } from '@local-wellness/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTransport } from 'nodemailer';
import { z } from 'zod';

import { renderWardComplaintEmail, type WardEmailComplaint } from './ward-email-template.js';
import type { WorkerLogger } from './worker-logger.js';

interface RpcResult {
  data: unknown;
  error: unknown;
}

type ServiceRoleRpc = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => PromiseLike<RpcResult>;

export interface WardEmailDelivery {
  from: string;
  subject: string;
  text: string;
  to: string;
}

export interface WardEmailTransport {
  sendMail(message: WardEmailDelivery): Promise<{ messageId: string }>;
}

export interface WardEmailSenderDependencies {
  fromAddress: string;
  transport: WardEmailTransport;
}

const claimedEmailSchema = z
  .object({
    attempt_count: z.number().int().positive(),
    category_name: z.string().trim().min(1),
    complaint_id: z.uuid(),
    complaint_number: z.string().trim().min(1),
    description: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    outbox_id: z.uuid(),
    recipient_email: z.email(),
    submitted_at: z.iso.datetime({ offset: true }),
    ward_name: z.string().trim().min(1),
  })
  .strict();

type ClaimedEmail = z.infer<typeof claimedEmailSchema>;

const decodeClaimedEmails = (value: unknown): ClaimedEmail[] => {
  const result = z.array(claimedEmailSchema).safeParse(value ?? []);
  if (!result.success) {
    throw new Error('WARD_EMAIL_CLAIM_RESPONSE_INVALID');
  }
  return result.data;
};

const toWardEmailComplaint = (row: ClaimedEmail): WardEmailComplaint => ({
  categoryName: row.category_name,
  complaintNumber: row.complaint_number,
  description: row.description,
  latitude: row.latitude,
  longitude: row.longitude,
  submittedAt: row.submitted_at,
  wardName: row.ward_name,
});

const loadSmtpDependencies = (
  environment: NodeJS.ProcessEnv = process.env,
): WardEmailSenderDependencies => {
  const host = environment['EMAIL_SMTP_HOST'];
  const port = Number(environment['EMAIL_SMTP_PORT'] ?? 587);
  const user = environment['EMAIL_SMTP_USER'];
  const password = environment['EMAIL_SMTP_PASSWORD'];
  if (!host || !user || !password || !Number.isInteger(port)) {
    throw new Error('EMAIL_SMTP_CONFIGURATION_MISSING');
  }

  const transporter = createTransport({
    auth: { pass: password, user },
    host,
    port,
    secure: port === 465,
  });
  return {
    fromAddress: environment['EMAIL_FROM']?.trim() || user,
    transport: {
      sendMail: async (message) => {
        const result = await transporter.sendMail(message);
        return { messageId: result.messageId };
      },
    },
  };
};

export class WardEmailSender {
  private readonly fromAddress: string;
  private readonly rpc: ServiceRoleRpc;
  private readonly transport: WardEmailTransport;

  public constructor(
    client: SupabaseClient<Database>,
    private readonly workerId: string,
    private readonly logger: WorkerLogger,
    dependencies: WardEmailSenderDependencies = loadSmtpDependencies(),
  ) {
    const fromAddress = dependencies.fromAddress.trim();
    if (!fromAddress) {
      throw new Error('EMAIL_FROM_CONFIGURATION_MISSING');
    }
    this.fromAddress = fromAddress;
    this.rpc = client.rpc.bind(client) as unknown as ServiceRoleRpc;
    this.transport = dependencies.transport;
  }

  public async runBatch(limit = 10): Promise<number> {
    const { data, error } = await this.rpc('claim_v1_ward_emails', {
      p_worker_id: this.workerId,
      p_limit: limit,
      p_lease_seconds: 300,
    });
    if (error) throw error;
    const claimedEmails = decodeClaimedEmails(data);
    if (claimedEmails.length > 0) {
      this.logger.info('ward_email_batch_claimed', { claimed: claimedEmails.length });
    }
    let sent = 0;
    for (const item of claimedEmails) {
      try {
        const message = renderWardComplaintEmail(toWardEmailComplaint(item));
        const result = await this.transport.sendMail({
          from: this.fromAddress,
          to: item.recipient_email,
          subject: message.subject,
          text: message.text,
        });
        const completed = await this.rpc('complete_v1_ward_email', {
          p_outbox_id: item.outbox_id,
          p_worker_id: this.workerId,
          p_provider_message_id: result.messageId,
        });
        if (completed.error) throw completed.error;
        sent += 1;
        this.logger.info('ward_email_sent', {
          complaintId: item.complaint_id,
          outboxId: item.outbox_id,
          providerMessageId: result.messageId,
        });
      } catch (error) {
        const failed = await this.rpc('fail_v1_ward_email', {
          p_outbox_id: item.outbox_id,
          p_worker_id: this.workerId,
          p_error_code: 'SMTP_DELIVERY_FAILED',
        });
        this.logger.warn('ward_email_delivery_failed', {
          errorCode: error instanceof Error ? error.name : 'UNKNOWN',
          failureRecorded: failed.error === null,
          outboxId: item.outbox_id,
        });
      }
    }
    return sent;
  }
}
