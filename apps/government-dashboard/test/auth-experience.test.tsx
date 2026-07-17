import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { GovernmentAuthorizationNote } from '../app/auth/government-authorization-note';
import { OtpSignInForm } from '../app/auth/login/otp-sign-in-form';
import { getMfaHeading } from '../app/auth/mfa/mfa-form';
import { GovernmentAccountIdentity } from '../app/government-account-context';

test('explains that government sign-in cannot create or authorize an account', () => {
  const markup = renderToStaticMarkup(
    <OtpSignInForm accountNotice={null} callbackError={false} nextPath="/" />,
  );

  assert.match(markup, /exact email address that received your government invitation/u);
  assert.match(markup, /never creates a government account/u);
  assert.match(markup, /active authority membership/u);
  assert.match(markup, /current scoped government role/u);
  assert.match(markup, /Account or authenticator recovery/u);
});

test('renders the exact signed-in identity separately from its authorization status', () => {
  const markup = renderToStaticMarkup(
    <GovernmentAccountIdentity
      authorizationLabel="2 active scoped roles"
      identity={{ email: 'officer@municipality.gov.in', userId: 'government-user-id' }}
    />,
  );

  assert.match(markup, /Signed in as/u);
  assert.match(markup, /officer@municipality\.gov\.in/u);
  assert.match(markup, /2 active scoped roles/u);
});

test('keeps authenticator enrollment and returning-account challenges distinct', () => {
  assert.equal(getMfaHeading('enrollment-required'), 'Set up your authenticator');
  assert.equal(getMfaHeading('enrollment'), 'Set up your authenticator');
  assert.equal(getMfaHeading('challenge'), 'Enter your authenticator code');
  assert.equal(getMfaHeading('loading'), 'Verify your government account');

  const note = renderToStaticMarkup(<GovernmentAuthorizationNote />);
  assert.match(note, /Signing in proves which account you own/u);
  assert.match(note, /separate authorization check/u);
});
