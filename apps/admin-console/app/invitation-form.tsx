'use client';

import {
  governmentInvitationRoleCodes,
  governmentInvitationRoleScopes,
  type GovernmentInvitationRoleCode,
} from '@local-wellness/types';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { createGovernmentInvitationAction, type InvitationActionState } from './actions';

const roleLabels: Readonly<Record<GovernmentInvitationRoleCode, string>> = {
  department_officer: 'Department officer',
  government_operator: 'Government operator',
  moderator: 'Authority moderator',
  municipal_admin: 'Municipal administrator',
  ward_officer: 'Ward officer',
};

const privilegedRoleCodes: readonly GovernmentInvitationRoleCode[] = [
  'moderator',
  'municipal_admin',
];

const toIsoTimestamp = (localDateTime: string): string => {
  const timestamp = Date.parse(localDateTime);
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString();
};

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button" disabled={pending} type="submit">
      {pending ? 'Creating invitation…' : 'Create government invitation'}
    </button>
  );
};

export const GovernmentInvitationForm = ({
  canAssignPrivilegedRoles,
  fixedAuthorityId,
}: Readonly<{ canAssignPrivilegedRoles: boolean; fixedAuthorityId: string | null }>) => {
  const initialState: InvitationActionState = { invitation: null, message: null, status: 'idle' };
  const [state, formAction] = useActionState(createGovernmentInvitationAction, initialState);
  const [effectiveUntilLocal, setEffectiveUntilLocal] = useState('');
  const [roleCode, setRoleCode] = useState<GovernmentInvitationRoleCode>('government_operator');
  const scopeType = governmentInvitationRoleScopes[roleCode];
  const availableRoleCodes = governmentInvitationRoleCodes.filter(
    (code) => canAssignPrivilegedRoles || !privilegedRoleCodes.includes(code),
  );
  const effectiveUntilIso = toIsoTimestamp(effectiveUntilLocal);

  return (
    <form action={formAction} className="invitation-form">
      <div className="field-group">
        <label htmlFor="email">Official email address</label>
        <input
          autoCapitalize="none"
          autoComplete="email"
          id="email"
          inputMode="email"
          name="email"
          placeholder="officer@municipality.gov.in"
          required
          type="email"
        />
      </div>

      {fixedAuthorityId === null ? (
        <div className="field-group">
          <label htmlFor="authorityId">Authority ID</label>
          <input
            autoCapitalize="none"
            id="authorityId"
            name="authorityId"
            placeholder="00000000-0000-4000-8000-000000000000"
            required
          />
          <p className="field-hint">
            Use the verified authority UUID from the governance directory.
          </p>
        </div>
      ) : (
        <div className="field-group">
          <span className="field-label">Authority ID</span>
          <output className="fixed-value">{fixedAuthorityId}</output>
          <input name="authorityId" type="hidden" value={fixedAuthorityId} />
          <p className="field-hint">
            Municipal administrators may invite users only within their assigned authority.
          </p>
        </div>
      )}

      <div className="field-group">
        <label htmlFor="roleCode">Government role</label>
        <select
          id="roleCode"
          name="roleCode"
          onChange={(event) => {
            setRoleCode(event.target.value as GovernmentInvitationRoleCode);
          }}
          value={roleCode}
        >
          {availableRoleCodes.map((code) => (
            <option key={code} value={code}>
              {roleLabels[code]}
            </option>
          ))}
        </select>
        <p className="field-hint">
          This role requires {scopeType === 'authority' ? 'authority' : scopeType} scope. The server
          validates every assignment.
        </p>
      </div>

      {scopeType === 'authority' ? null : (
        <div className="field-group">
          <label htmlFor="scopeId">{scopeType === 'ward' ? 'Ward' : 'Department'} scope ID</label>
          <input
            autoCapitalize="none"
            id="scopeId"
            name="scopeId"
            placeholder="00000000-0000-4000-8000-000000000000"
            required
          />
        </div>
      )}

      <div className="field-group">
        <label htmlFor="effectiveUntilLocal">Role expiry (optional)</label>
        <input
          id="effectiveUntilLocal"
          onChange={(event) => {
            setEffectiveUntilLocal(event.target.value);
          }}
          type="datetime-local"
          value={effectiveUntilLocal}
        />
        <input name="effectiveUntil" type="hidden" value={effectiveUntilIso} />
        <p className="field-hint">
          The selected local time is converted to an exact UTC timestamp.
        </p>
      </div>

      <SubmitButton />

      {state.message === null ? null : (
        <div
          aria-live={state.status === 'error' ? 'assertive' : 'polite'}
          className={state.status === 'error' ? 'error-notice' : 'success-notice'}
          role={state.status === 'error' ? 'alert' : 'status'}
        >
          <strong>{state.message}</strong>
          {state.invitation === null ? null : (
            <dl className="result-details">
              <div>
                <dt>Role</dt>
                <dd>{state.invitation.roleCode}</dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>
                  {state.invitation.scopeType}: {state.invitation.scopeId}
                </dd>
              </div>
              <div>
                <dt>Membership</dt>
                <dd>{state.invitation.membershipStatus}</dd>
              </div>
              <div>
                <dt>Authentication invitation</dt>
                <dd>{state.invitation.authInvitationStatus}</dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </form>
  );
};
