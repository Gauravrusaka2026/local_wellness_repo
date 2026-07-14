'use server';

import { revalidatePath } from 'next/cache';
import type { GovernmentResolutionEvidenceUploadIntent } from '@local-wellness/types';
import {
  createGovernmentResolutionEvidenceUploadIntentSchema,
  finalizeGovernmentResolutionEvidenceSchema,
  governmentComplaintIdParametersSchema,
  governmentResolutionEvidenceIdParametersSchema,
} from '@local-wellness/validation';

import {
  completeGovernmentComplaintInspection,
  createResolutionEvidenceUploadIntent,
  finalizeResolutionEvidence,
  postGovernmentComplaintAction,
  resolveGovernmentComplaintExternalDependency,
  type GovernmentComplaintActionPath,
} from '../../../lib/api/government-complaints';
import { ApiError, getUserFacingApiError, getVerifiedAccessToken } from '../../../lib/api/client';
import {
  GovernmentActionInputError,
  parseGovernmentActionForm,
  type DashboardActionName,
} from '../../../lib/complaints/action-input';
import { createServerSupabaseClient } from '../../../lib/supabase/server';

export type GovernmentActionState = Readonly<{
  message: string | null;
  status: 'conflict' | 'error' | 'idle' | 'success';
}>;

export const initialGovernmentActionState: GovernmentActionState = {
  message: null,
  status: 'idle',
};

const actionPaths: Readonly<Partial<Record<DashboardActionName, GovernmentComplaintActionPath>>> = {
  acknowledge: 'acknowledge',
  add_external_dependency: 'external-dependencies',
  add_internal_note: 'internal-notes',
  add_work_reference: 'work-references',
  assign: 'assign',
  schedule_inspection: 'inspections',
  submit_resolution: 'resolution',
  transfer: 'transfer',
  update_status: 'status',
};

const successMessages: Readonly<Record<DashboardActionName, string>> = {
  acknowledge: 'The complaint was acknowledged.',
  add_external_dependency: 'The external dependency was recorded.',
  add_internal_note: 'The private internal note was added.',
  add_work_reference: 'The work reference was recorded.',
  assign: 'The complaint assignment was updated.',
  complete_inspection: 'The inspection result was recorded.',
  schedule_inspection: 'The inspection was scheduled.',
  resolve_external_dependency: 'The external dependency was marked as resolved.',
  submit_resolution: 'The resolution was submitted for citizen verification.',
  transfer: 'The complaint was transferred and its assignment history was preserved.',
  update_status: 'The complaint status was updated.',
};

const toErrorState = (error: unknown): GovernmentActionState => {
  if (
    error instanceof ApiError &&
    (error.status === 409 || error.code === 'COMPLAINT_WORKFLOW_VERSION_CONFLICT')
  ) {
    return {
      message:
        'This complaint changed while you were working. Reload the latest details before trying again.',
      status: 'conflict',
    };
  }

  return {
    message:
      error instanceof GovernmentActionInputError ? error.message : getUserFacingApiError(error),
    status: 'error',
  };
};

export const performGovernmentComplaintAction = async (
  previousState: GovernmentActionState,
  formData: FormData,
): Promise<GovernmentActionState> => {
  void previousState;
  try {
    const parsed = parseGovernmentActionForm(formData);
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);

    if (parsed.action === 'complete_inspection') {
      await completeGovernmentComplaintInspection(
        accessToken,
        parsed.complaintId,
        parsed.inspectionId ?? '',
        parsed.body,
        parsed.idempotencyKey,
      );
    } else if (parsed.action === 'resolve_external_dependency') {
      await resolveGovernmentComplaintExternalDependency(
        accessToken,
        parsed.complaintId,
        parsed.dependencyId ?? '',
        parsed.body,
        parsed.idempotencyKey,
      );
    } else {
      const actionPath = actionPaths[parsed.action];
      if (actionPath === undefined) throw new GovernmentActionInputError();
      await postGovernmentComplaintAction(
        accessToken,
        parsed.complaintId,
        actionPath,
        parsed.body,
        parsed.idempotencyKey,
      );
    }

    revalidatePath('/');
    revalidatePath(`/complaints/${parsed.complaintId}`);
    return { message: successMessages[parsed.action], status: 'success' };
  } catch (error) {
    return toErrorState(error);
  }
};

export type ResolutionEvidenceIntentState =
  | Readonly<{ message: string; status: 'error' }>
  | Readonly<{
      intent: GovernmentResolutionEvidenceUploadIntent;
      status: 'success';
    }>;

const formText = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
};

export const requestResolutionEvidenceUpload = async (
  formData: FormData,
): Promise<ResolutionEvidenceIntentState> => {
  try {
    const complaintId = formText(formData, 'complaintId');
    const idempotencyKey = formText(formData, 'idempotencyKey');
    const identifiers = governmentComplaintIdParametersSchema.parse({ complaintId });
    const input = createGovernmentResolutionEvidenceUploadIntentSchema.parse({
      byteSize: Number(formText(formData, 'byteSize')),
      expectedWorkflowVersion: Number(formText(formData, 'expectedWorkflowVersion')),
      kind: formText(formData, 'kind'),
      mimeType: formText(formData, 'mimeType'),
      sha256: formText(formData, 'sha256'),
    });
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);
    const intent = await createResolutionEvidenceUploadIntent(
      accessToken,
      identifiers.complaintId,
      input,
      idempotencyKey,
    );
    return { intent, status: 'success' };
  } catch (error) {
    return { message: getUserFacingApiError(error), status: 'error' };
  }
};

export const finalizeResolutionEvidenceUpload = async (
  formData: FormData,
): Promise<GovernmentActionState> => {
  try {
    const complaintId = formText(formData, 'complaintId');
    const evidenceId = formText(formData, 'evidenceId');
    const idempotencyKey = formText(formData, 'idempotencyKey');
    const identifiers = governmentResolutionEvidenceIdParametersSchema.parse({
      complaintId,
      evidenceId,
    });
    const input = finalizeGovernmentResolutionEvidenceSchema.parse({
      byteSize: Number(formText(formData, 'byteSize')),
      expectedWorkflowVersion: Number(formText(formData, 'expectedWorkflowVersion')),
      sha256: formText(formData, 'sha256'),
    });
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);
    await finalizeResolutionEvidence(
      accessToken,
      identifiers.complaintId,
      identifiers.evidenceId,
      input,
      idempotencyKey,
    );
    revalidatePath(`/complaints/${identifiers.complaintId}`);
    return { message: 'The private resolution evidence is ready.', status: 'success' };
  } catch (error) {
    return toErrorState(error);
  }
};
