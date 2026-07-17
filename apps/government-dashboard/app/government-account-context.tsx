import React from 'react';

import type { VerifiedGovernmentIdentity } from '../lib/api/client';
import { getGovernmentAccountLabel } from '../lib/api/client';
import { signOutAction, switchGovernmentAccountAction } from '../lib/auth/actions';

type GovernmentAccountIdentityProperties = Readonly<{
  authorizationLabel: string;
  identity: VerifiedGovernmentIdentity;
}>;

export const GovernmentAccountIdentity = ({
  authorizationLabel,
  identity,
}: GovernmentAccountIdentityProperties) => (
  <div className="government-account-identity">
    <span>Signed in as</span>
    <strong>{getGovernmentAccountLabel(identity)}</strong>
    <small>{authorizationLabel}</small>
  </div>
);

export const GovernmentAccountContext = ({
  authorizationLabel,
  identity,
}: GovernmentAccountIdentityProperties) => (
  <aside aria-label="Current government account" className="government-account-context">
    <GovernmentAccountIdentity authorizationLabel={authorizationLabel} identity={identity} />
    <div className="government-account-actions">
      <form action={switchGovernmentAccountAction}>
        <button className="text-button" type="submit">
          Use another account
        </button>
      </form>
      <form action={signOutAction}>
        <button className="secondary-button" type="submit">
          Sign out
        </button>
      </form>
    </div>
  </aside>
);
