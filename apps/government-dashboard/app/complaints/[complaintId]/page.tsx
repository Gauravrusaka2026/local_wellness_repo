import { notFound, redirect } from 'next/navigation';
import { governmentComplaintIdParametersSchema } from '@local-wellness/validation';

import {
  getGovernmentComplaint,
  getGovernmentComplaintAssignmentOptions,
} from '../../../lib/api/government-complaints';
import { getGovernmentAccessScope } from '../../../lib/api/access-scope';
import {
  ApiError,
  AuthenticationRequiredError,
  getUserFacingApiError,
  getVerifiedAccessToken,
} from '../../../lib/api/client';
import { signOutAction } from '../../../lib/auth/actions';
import {
  buildQueueHref,
  parseComplaintScope,
  type DashboardSearchParameters,
} from '../../../lib/complaints/query';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { ComplaintDetailView } from './detail-view';

export const dynamic = 'force-dynamic';

type DetailPageProperties = Readonly<{
  params: Promise<Readonly<{ complaintId: string }>>;
  searchParams: Promise<DashboardSearchParameters>;
}>;

type DetailLoadResult =
  | Readonly<{ status: 'denied' }>
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'not-found' }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{
      status: 'success';
      assignmentOptions: Awaited<
        ReturnType<typeof getGovernmentComplaintAssignmentOptions>
      >['options'];
      complaint: Awaited<ReturnType<typeof getGovernmentComplaint>>;
      queueHref: string;
    }>;

const loadComplaint = async (
  complaintId: string,
  searchParameters: DashboardSearchParameters,
): Promise<DetailLoadResult> => {
  try {
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);
    const accessScope = await getGovernmentAccessScope(accessToken);
    const selectedScope = parseComplaintScope(searchParameters, accessScope);
    if (!selectedScope.isValid) return { status: 'denied' };

    const complaint = await getGovernmentComplaint(
      accessToken,
      complaintId,
      selectedScope.scopeRoleAssignmentId,
    );
    const needsOptions = complaint.allowedActions.some(
      (action) => action === 'assign' || action === 'transfer',
    );
    const assignmentOptions = needsOptions
      ? (
          await getGovernmentComplaintAssignmentOptions(
            accessToken,
            complaintId,
            selectedScope.scopeRoleAssignmentId,
          )
        ).options
      : [];
    const queueHref = buildQueueHref({
      cursor: '',
      fromDate: '',
      queue: '',
      scopeRoleAssignmentId: selectedScope.scopeRoleAssignmentId ?? '',
      search: '',
      status: '',
      toDate: '',
    });
    return { assignmentOptions, complaint, queueHref, status: 'success' };
  } catch (error) {
    if (
      error instanceof AuthenticationRequiredError ||
      (error instanceof ApiError && error.status === 401)
    )
      return { status: 'signed-out' };
    if (error instanceof ApiError && error.status === 403) return { status: 'denied' };
    if (error instanceof ApiError && error.status === 404) return { status: 'not-found' };
    return { message: getUserFacingApiError(error), status: 'error' };
  }
};

export default async function ComplaintPage({ params, searchParams }: DetailPageProperties) {
  const identifiers = governmentComplaintIdParametersSchema.safeParse(await params);
  if (!identifiers.success) notFound();

  const result = await loadComplaint(identifiers.data.complaintId, await searchParams);
  if (result.status === 'signed-out') {
    redirect(`/auth/login?next=/complaints/${identifiers.data.complaintId}`);
  }
  if (result.status === 'not-found') notFound();

  if (result.status === 'denied' || result.status === 'error') {
    return (
      <main className="centered-page" id="main-content">
        <section className="content-card denied-card">
          <p className="eyebrow">Government complaint workspace</p>
          <h1>
            {result.status === 'denied' ? 'Complaint access denied' : 'Complaint unavailable'}
          </h1>
          <p className="error-notice" role="alert">
            {result.status === 'denied'
              ? 'This complaint is outside your current authority, ward, or department scope.'
              : result.message}
          </p>
          <div className="button-row">
            <a className="primary-link" href="/">
              Return to queue
            </a>
            <form action={signOutAction}>
              <button className="secondary-button" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to complaint details
      </a>
      <main className="complaint-shell" id="main-content">
        <ComplaintDetailView
          assignmentOptions={result.assignmentOptions}
          complaint={result.complaint}
          queueHref={result.queueHref}
        />
      </main>
    </>
  );
}
