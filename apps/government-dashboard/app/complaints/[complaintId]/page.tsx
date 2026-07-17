import { notFound, redirect } from 'next/navigation';
import { governmentComplaintIdParametersSchema } from '@local-wellness/validation';

import {
  getGovernmentComplaint,
  getGovernmentComplaintAccountability,
  getGovernmentComplaintAssignmentOptions,
} from '../../../lib/api/government-complaints';
import { getGovernmentComplaintSla } from '../../../lib/api/accountability';
import { getGovernmentAccessScope } from '../../../lib/api/access-scope';
import { getComplaintMessages } from '../../../lib/api/communications';
import {
  ApiError,
  AuthenticationRequiredError,
  getUserFacingApiError,
  getVerifiedGovernmentSession,
  type VerifiedGovernmentIdentity,
} from '../../../lib/api/client';
import {
  buildQueueHref,
  parseComplaintScope,
  type DashboardSearchParameters,
} from '../../../lib/complaints/query';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { GovernmentAccountContext } from '../../government-account-context';
import { ComplaintDetailView } from './detail-view';

export const dynamic = 'force-dynamic';

type DetailPageProperties = Readonly<{
  params: Promise<Readonly<{ complaintId: string }>>;
  searchParams: Promise<DashboardSearchParameters>;
}>;

type DetailLoadResult =
  | Readonly<{ status: 'denied'; identity: VerifiedGovernmentIdentity }>
  | Readonly<{ status: 'error'; identity: VerifiedGovernmentIdentity; message: string }>
  | Readonly<{ status: 'not-found' }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{
      status: 'success';
      identity: VerifiedGovernmentIdentity;
      assignmentOptions: Awaited<
        ReturnType<typeof getGovernmentComplaintAssignmentOptions>
      >['options'];
      accountability: Awaited<ReturnType<typeof getGovernmentComplaintAccountability>> | null;
      accountabilityError: string | null;
      communicationError: string | null;
      complaint: Awaited<ReturnType<typeof getGovernmentComplaint>>;
      messages: Awaited<ReturnType<typeof getComplaintMessages>>['items'];
      queueHref: string;
      sla: Awaited<ReturnType<typeof getGovernmentComplaintSla>> | null;
      slaError: string | null;
    }>;

const loadComplaint = async (
  complaintId: string,
  searchParameters: DashboardSearchParameters,
): Promise<DetailLoadResult> => {
  let session: Awaited<ReturnType<typeof getVerifiedGovernmentSession>>;

  try {
    const supabase = await createServerSupabaseClient();
    session = await getVerifiedGovernmentSession(supabase);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return { status: 'signed-out' };
    throw error;
  }

  try {
    const accessScope = await getGovernmentAccessScope(session.accessToken);
    const selectedScope = parseComplaintScope(searchParameters, accessScope);
    if (!selectedScope.isValid) return { identity: session.identity, status: 'denied' };

    const complaint = await getGovernmentComplaint(
      session.accessToken,
      complaintId,
      selectedScope.scopeRoleAssignmentId,
    );
    let sla: Awaited<ReturnType<typeof getGovernmentComplaintSla>> | null = null;
    let slaError: string | null = null;
    try {
      sla = await getGovernmentComplaintSla(
        session.accessToken,
        complaintId,
        selectedScope.scopeRoleAssignmentId,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        (error instanceof ApiError && error.status === 401)
      ) {
        throw error;
      }
      slaError = getUserFacingApiError(error);
    }
    let accountability: Awaited<ReturnType<typeof getGovernmentComplaintAccountability>> | null =
      null;
    let accountabilityError: string | null = null;
    try {
      accountability = await getGovernmentComplaintAccountability(
        session.accessToken,
        complaintId,
        selectedScope.scopeRoleAssignmentId,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        (error instanceof ApiError && error.status === 401)
      ) {
        throw error;
      }
      accountabilityError = getUserFacingApiError(error);
    }
    let communicationError: string | null = null;
    let messages: Awaited<ReturnType<typeof getComplaintMessages>>['items'] = [];
    try {
      messages = (await getComplaintMessages(session.accessToken, complaintId)).items;
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        (error instanceof ApiError && error.status === 401)
      ) {
        throw error;
      }
      communicationError = getUserFacingApiError(error);
    }
    const needsOptions = complaint.allowedActions.some(
      (action) => action === 'assign' || action === 'transfer',
    );
    const assignmentOptions = needsOptions
      ? (
          await getGovernmentComplaintAssignmentOptions(
            session.accessToken,
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
    return {
      accountability,
      accountabilityError,
      assignmentOptions,
      communicationError,
      complaint,
      identity: session.identity,
      messages,
      queueHref,
      sla,
      slaError,
      status: 'success',
    };
  } catch (error) {
    if (
      error instanceof AuthenticationRequiredError ||
      (error instanceof ApiError && error.status === 401)
    )
      return { status: 'signed-out' };
    if (error instanceof ApiError && error.status === 403) {
      return { identity: session.identity, status: 'denied' };
    }
    if (error instanceof ApiError && error.status === 404) return { status: 'not-found' };
    return {
      identity: session.identity,
      message: getUserFacingApiError(error),
      status: 'error',
    };
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
          <GovernmentAccountContext
            authorizationLabel={
              result.status === 'denied'
                ? 'Signed in; this complaint is outside the active scope'
                : 'Signed-in session verified; complaint check failed'
            }
            identity={result.identity}
          />
          <div className="button-row">
            <a className="primary-link" href="/">
              Return to queue
            </a>
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
        <div className="complaint-account-bar">
          <GovernmentAccountContext
            authorizationLabel="Complaint access verified for the active scope"
            identity={result.identity}
          />
        </div>
        <ComplaintDetailView
          accountability={result.accountability}
          accountabilityError={result.accountabilityError}
          assignmentOptions={result.assignmentOptions}
          communicationError={result.communicationError}
          complaint={result.complaint}
          messages={result.messages}
          queueHref={result.queueHref}
          sla={result.sla}
          slaError={result.slaError}
        />
      </main>
    </>
  );
}
