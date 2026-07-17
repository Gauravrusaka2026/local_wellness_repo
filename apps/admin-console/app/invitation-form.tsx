'use client';

import {
  governmentInvitationRoleCodes,
  governmentInvitationRoleScopes,
  type GovernmentInvitationOptions,
  type GovernmentInvitationRoleCode,
} from '@local-wellness/types';
import React, { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { createGovernmentInvitationAction, type InvitationActionState } from './actions';

const roleLabels: Readonly<Record<GovernmentInvitationRoleCode, string>> = {
  department_officer: 'Department officer',
  government_operator: 'Government operator',
  moderator: 'Authority moderator',
  municipal_admin: 'Municipal administrator',
  ward_officer: 'Ward officer',
};

const roleDescriptions: Readonly<Record<GovernmentInvitationRoleCode, string>> = {
  department_officer: 'Works only with complaints assigned to the selected department.',
  government_operator: 'Works across the selected municipal authority.',
  moderator: 'Reviews public and moderated content for the selected authority.',
  municipal_admin: 'Manages official access within the selected authority.',
  ward_officer: 'Works only with complaints assigned to the selected ward.',
};

const privilegedRoleCodes: readonly GovernmentInvitationRoleCode[] = [
  'moderator',
  'municipal_admin',
];

const toIsoTimestamp = (localDateTime: string): string => {
  const timestamp = Date.parse(localDateTime);
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString();
};

const SubmitButton = ({ disabled }: Readonly<{ disabled: boolean }>) => {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button" disabled={pending || disabled} type="submit">
      {pending ? 'Creating invitation…' : 'Create government invitation'}
    </button>
  );
};

export const GovernmentInvitationForm = ({
  canAssignPrivilegedRoles,
  fixedAuthorityId,
  options,
}: Readonly<{
  canAssignPrivilegedRoles: boolean;
  fixedAuthorityId: string | null;
  options: GovernmentInvitationOptions;
}>) => {
  const initialState: InvitationActionState = { invitation: null, message: null, status: 'idle' };
  const [state, formAction] = useActionState(createGovernmentInvitationAction, initialState);
  const [effectiveUntilLocal, setEffectiveUntilLocal] = useState('');
  const [roleCode, setRoleCode] = useState<GovernmentInvitationRoleCode>('government_operator');
  const selectableAuthorities =
    fixedAuthorityId === null
      ? options.authorities
      : options.authorities.filter((authority) => authority.id === fixedAuthorityId);
  const [authorityId, setAuthorityId] = useState(
    fixedAuthorityId ?? selectableAuthorities[0]?.id ?? '',
  );
  const scopeType = governmentInvitationRoleScopes[roleCode];
  const availableRoleCodes = governmentInvitationRoleCodes.filter(
    (code) => canAssignPrivilegedRoles || !privilegedRoleCodes.includes(code),
  );
  const effectiveUntilIso = toIsoTimestamp(effectiveUntilLocal);
  const selectedAuthority = options.authorities.find((authority) => authority.id === authorityId);
  const availableScopes = (scopeType === 'ward' ? options.wards : options.departments).filter(
    (scope) => scope.authorityId === authorityId,
  );
  const canSubmit =
    selectedAuthority !== undefined && (scopeType === 'authority' || availableScopes.length > 0);

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
        <p className="field-hint">
          This exact address becomes the official&apos;s sign-in identity. Do not use a shared inbox
          or your own administrator email.
        </p>
      </div>

      {fixedAuthorityId === null ? (
        <div className="field-group">
          <label htmlFor="authorityId">Governing authority</label>
          <select
            id="authorityId"
            name="authorityId"
            onChange={(event) => {
              setAuthorityId(event.target.value);
            }}
            required
            value={authorityId}
          >
            {selectableAuthorities.length === 0 ? (
              <option value="">No verified authorities available</option>
            ) : null}
            {selectableAuthorities.map((authority) => (
              <option key={authority.id} value={authority.id}>
                {authority.name} ({authority.code})
              </option>
            ))}
          </select>
          <p className="field-hint">
            Only active, verified, non-placeholder authorities from the governance registry appear
            here.
          </p>
        </div>
      ) : (
        <div className="field-group">
          <span className="field-label">Governing authority</span>
          <output className="fixed-value">
            {selectedAuthority === undefined
              ? 'Assigned authority is unavailable in the verified governance registry'
              : `${selectedAuthority.name} (${selectedAuthority.code})`}
          </output>
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
          {roleDescriptions[roleCode]} The server validates the role and scope again before any
          access is granted.
        </p>
      </div>

      {scopeType === 'authority' ? null : (
        <div className="field-group">
          <label htmlFor="scopeId">{scopeType === 'ward' ? 'Ward' : 'Department'} scope</label>
          <select id="scopeId" key={`${authorityId}:${scopeType}`} name="scopeId" required>
            {availableScopes.length === 0 ? (
              <option value="">No verified {scopeType} scopes available</option>
            ) : null}
            {availableScopes.map((scope) => (
              <option key={scope.id} value={scope.id}>
                {scope.name} ({scope.code})
              </option>
            ))}
          </select>
          <p className="field-hint">
            The official will see only records allowed by this reviewed scope.
          </p>
        </div>
      )}

      {selectedAuthority === undefined ? (
        <p aria-live="polite" className="error-notice" role="status">
          No eligible governing authority is available for invitations. Load and verify the
          authority in the governance registry before assigning official access.
        </p>
      ) : scopeType !== 'authority' && availableScopes.length === 0 ? (
        <p aria-live="polite" className="error-notice" role="status">
          This authority has no verified {scopeType} scopes available. Choose another role or finish
          governance verification first.
        </p>
      ) : null}

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

      <SubmitButton disabled={!canSubmit} />

      {state.message === null ? null : (
        <div
          aria-live={state.status === 'error' ? 'assertive' : 'polite'}
          className={state.status === 'error' ? 'error-notice' : 'success-notice'}
          role={state.status === 'error' ? 'alert' : 'status'}
        >
          <strong>{state.message}</strong>
          {state.invitation === null ? null : (
            <>
              <p>
                Tell the official to open the newest invitation for{' '}
                <strong>{state.invitation.email}</strong>, then sign in with that same address and
                enroll their own authenticator.
              </p>
              <dl className="result-details">
                <div>
                  <dt>Role</dt>
                  <dd>{roleLabels[state.invitation.roleCode]}</dd>
                </div>
                <div>
                  <dt>Authority</dt>
                  <dd>
                    {options.authorities.find(
                      (authority) => authority.id === state.invitation?.authorityId,
                    )?.name ?? 'Authorized governing authority'}
                  </dd>
                </div>
                <div>
                  <dt>Scope</dt>
                  <dd>
                    {state.invitation.scopeType === 'authority'
                      ? 'Entire authority'
                      : ([...options.wards, ...options.departments].find(
                          (scope) => scope.id === state.invitation?.scopeId,
                        )?.name ?? 'Authorized government scope')}
                  </dd>
                </div>
                <div>
                  <dt>Access record</dt>
                  <dd>
                    Membership {state.invitation.membershipStatus}; role{' '}
                    {state.invitation.roleStatus}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </div>
      )}
    </form>
  );
};
