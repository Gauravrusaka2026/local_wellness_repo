import assert from 'node:assert/strict';
import test from 'node:test';

import type { Database } from '@local-wellness/database';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  WardEmailSender,
  type WardEmailDelivery,
  type WardEmailTransport,
} from './ward-email-sender.js';
import type { WorkerLogFields, WorkerLogger } from './worker-logger.js';

const claimedEmail = {
  attempt_count: 1,
  category_name: 'Garbage dump',
  complaint_id: '10000000-0000-4000-8000-000000000001',
  complaint_number: 'JS-MUM-2026-000001',
  description: 'Garbage has accumulated beside the public footpath.',
  latitude: 19.1234,
  longitude: 72.8765,
  outbox_id: '20000000-0000-4000-8000-000000000001',
  recipient_email: 'ac.kw@mcgm.gov.in',
  submitted_at: '2026-07-22T06:06:08.921Z',
  ward_name: 'K/West Ward',
} as const;

interface RpcCall {
  arguments: Record<string, unknown>;
  functionName: string;
}

class RecordingLogger implements WorkerLogger {
  public readonly entries: { event: string; fields?: WorkerLogFields; level: string }[] = [];

  public error(event: string, fields?: WorkerLogFields): void {
    this.entries.push({ event, ...(fields === undefined ? {} : { fields }), level: 'error' });
  }

  public info(event: string, fields?: WorkerLogFields): void {
    this.entries.push({ event, ...(fields === undefined ? {} : { fields }), level: 'info' });
  }

  public warn(event: string, fields?: WorkerLogFields): void {
    this.entries.push({ event, ...(fields === undefined ? {} : { fields }), level: 'warn' });
  }
}

const createClient = (
  rpc: (
    functionName: string,
    arguments_: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: unknown;
  }>,
): SupabaseClient<Database> => ({ rpc }) as unknown as SupabaseClient<Database>;

test('maps claimed RPC rows into the email template and completes successful delivery', async () => {
  const rpcCalls: RpcCall[] = [];
  const deliveries: WardEmailDelivery[] = [];
  const client = createClient(async (functionName, arguments_) => {
    rpcCalls.push({ arguments: arguments_, functionName });
    if (functionName === 'claim_v1_ward_emails') {
      return { data: [claimedEmail], error: null };
    }
    if (functionName === 'complete_v1_ward_email') {
      return { data: null, error: null };
    }
    throw new Error(`Unexpected RPC: ${functionName}`);
  });
  const transport: WardEmailTransport = {
    sendMail: async (message) => {
      deliveries.push(message);
      return { messageId: 'smtp-message-1' };
    },
  };
  const logger = new RecordingLogger();
  const sender = new WardEmailSender(client, 'worker:ward-email', logger, {
    fromAddress: 'JagrukSetu <gaurav@rusaka.com>',
    transport,
  });

  const sent = await sender.runBatch(3);

  assert.equal(sent, 1);
  assert.equal(deliveries.length, 1);
  assert.deepEqual(deliveries[0], {
    from: 'JagrukSetu <gaurav@rusaka.com>',
    subject: '[JagrukSetu] Complaint JS-MUM-2026-000001 – Garbage dump',
    text: [
      'Dear Ward Office,',
      '',
      'A civic complaint has been routed to your office through JagrukSetu.',
      '',
      'Complaint number: JS-MUM-2026-000001',
      'Ward: K/West Ward',
      'Category: Garbage dump',
      'Submitted: 2026-07-22T06:06:08.921Z',
      '',
      'Description:',
      'Garbage has accumulated beside the public footpath.',
      '',
      'Please acknowledge and process this complaint according to your normal procedure.',
      'This message contains no citizen contact details or private media.',
      '',
      'Regards,',
      'JagrukSetu',
    ].join('\n'),
    to: 'ac.kw@mcgm.gov.in',
  });
  assert.deepEqual(rpcCalls, [
    {
      arguments: {
        p_lease_seconds: 300,
        p_limit: 3,
        p_worker_id: 'worker:ward-email',
      },
      functionName: 'claim_v1_ward_emails',
    },
    {
      arguments: {
        p_outbox_id: claimedEmail.outbox_id,
        p_provider_message_id: 'smtp-message-1',
        p_worker_id: 'worker:ward-email',
      },
      functionName: 'complete_v1_ward_email',
    },
  ]);
  assert.equal(
    logger.entries.some(
      (entry) =>
        entry.event === 'ward_email_sent' &&
        entry.fields?.['complaintId'] === claimedEmail.complaint_id,
    ),
    true,
  );
});

test('records an SMTP delivery failure without completing or leaking the provider error', async () => {
  const rpcCalls: RpcCall[] = [];
  const client = createClient(async (functionName, arguments_) => {
    rpcCalls.push({ arguments: arguments_, functionName });
    if (functionName === 'claim_v1_ward_emails') {
      return { data: [claimedEmail], error: null };
    }
    if (functionName === 'fail_v1_ward_email') {
      return { data: null, error: null };
    }
    throw new Error(`Unexpected RPC: ${functionName}`);
  });
  const transport: WardEmailTransport = {
    sendMail: async () => {
      throw new Error('SMTP password and provider response must stay private');
    },
  };
  const logger = new RecordingLogger();
  const sender = new WardEmailSender(client, 'worker:ward-email', logger, {
    fromAddress: 'gaurav@rusaka.com',
    transport,
  });

  const sent = await sender.runBatch();

  assert.equal(sent, 0);
  assert.deepEqual(
    rpcCalls.map((call) => call.functionName),
    ['claim_v1_ward_emails', 'fail_v1_ward_email'],
  );
  assert.deepEqual(rpcCalls[1]?.arguments, {
    p_error_code: 'SMTP_DELIVERY_FAILED',
    p_outbox_id: claimedEmail.outbox_id,
    p_worker_id: 'worker:ward-email',
  });
  assert.equal(
    logger.entries.some(
      (entry) =>
        entry.event === 'ward_email_delivery_failed' && entry.fields?.['failureRecorded'] === true,
    ),
    true,
  );
  assert.equal(JSON.stringify(logger.entries).includes('SMTP password'), false);
});
