import React from 'react';

export const GovernmentAuthorizationNote = () => (
  <p className="security-note">
    Signing in proves which account you own. Dashboard access is a separate authorization check: the
    same account must also have an active authority membership and a current scoped government role.
    This dashboard cannot create or grant either one.
  </p>
);
