'use server';

import { revalidatePath } from 'next/cache';

import {
  getComplaintResolutionContext,
  getUserFacingComplaintError,
  reopenComplaint,
  submitComplaintFeedback,
} from '../../../lib/api/complaints';
import { ApiError, getVerifiedAccessToken } from '../../../lib/api/client';
import {
  ComplaintActionInputError,
  parseComplaintActionIdentifiers,
  parseComplaintFeedbackInput,
  parseComplaintReopenInput,
} from '../../../lib/complaints/action-input';
import { createServerSupabaseClient } from '../../../lib/supabase/server';

export type ComplaintActionState = Readonly<{
  message: string | null;
  status: 'conflict' | 'error' | 'idle' | 'success';
}>;

export const initialComplaintActionState: ComplaintActionState = {
  message: null,
  status: 'idle',
};

const toErrorState = (error: unknown): ComplaintActionState => ({
  message:
    error instanceof ComplaintActionInputError ? error.message : getUserFacingComplaintError(error),
  status: error instanceof ApiError && error.status === 409 ? 'conflict' : 'error',
});

const loadActionContext = async (formData: FormData) => {
  const identifiers = parseComplaintActionIdentifiers(formData);
  const supabase = await createServerSupabaseClient();
  const accessToken = await getVerifiedAccessToken(supabase);
  const context = await getComplaintResolutionContext(accessToken, identifiers.complaintId);
  return { accessToken, context, identifiers };
};

export const submitComplaintFeedbackAction = async (
  previousState: ComplaintActionState,
  formData: FormData,
): Promise<ComplaintActionState> => {
  void previousState;
  try {
    const { accessToken, context, identifiers } = await loadActionContext(formData);
    const input = parseComplaintFeedbackInput(formData, context);
    await submitComplaintFeedback(
      accessToken,
      identifiers.complaintId,
      input,
      identifiers.idempotencyKey,
    );
    revalidatePath('/complaints');
    revalidatePath(`/complaints/${identifiers.complaintId}`);
    return { message: 'Your resolution feedback was recorded.', status: 'success' };
  } catch (error) {
    return toErrorState(error);
  }
};

export const reopenComplaintAction = async (
  previousState: ComplaintActionState,
  formData: FormData,
): Promise<ComplaintActionState> => {
  void previousState;
  try {
    const { accessToken, context, identifiers } = await loadActionContext(formData);
    const input = parseComplaintReopenInput(formData, context);
    const result = await reopenComplaint(
      accessToken,
      identifiers.complaintId,
      input,
      identifiers.idempotencyKey,
    );
    revalidatePath('/complaints');
    revalidatePath(`/complaints/${identifiers.complaintId}`);
    return {
      message:
        result.status === 'escalated'
          ? 'Your complaint was reopened and escalated under the current policy.'
          : 'Your complaint was reopened for further government action.',
      status: 'success',
    };
  } catch (error) {
    return toErrorState(error);
  }
};
