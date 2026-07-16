import assert from 'node:assert/strict';
import test from 'node:test';

import { getUserFacingAuthError } from '../src/auth/auth-error';
import { AuthInputError } from '../src/auth/auth-input';
import { createOtpRequest } from '../src/auth/otp-request';

const callbackUrl = 'localwellness://auth/callback';

test('uses non-registering OTP requests for sign-in and account recovery', () => {
  assert.deepEqual(createOtpRequest('email', ' Citizen@Example.org ', 'sign_in', callbackUrl), {
    credentials: {
      email: 'citizen@example.org',
      options: { emailRedirectTo: callbackUrl, shouldCreateUser: false },
    },
    normalizedIdentifier: 'citizen@example.org',
  });
  assert.deepEqual(createOtpRequest('phone', '+91 98765 43210', 'recover_account', callbackUrl), {
    credentials: { phone: '+919876543210', options: { shouldCreateUser: false } },
    normalizedIdentifier: '+919876543210',
  });
});

test('allows Supabase to provision a citizen only in create-account mode', () => {
  assert.deepEqual(createOtpRequest('email', 'new@example.org', 'create_account', callbackUrl), {
    credentials: {
      email: 'new@example.org',
      options: { emailRedirectTo: callbackUrl, shouldCreateUser: true },
    },
    normalizedIdentifier: 'new@example.org',
  });
  assert.deepEqual(createOtpRequest('phone', '+919876543210', 'create_account', callbackUrl), {
    credentials: { phone: '+919876543210', options: { shouldCreateUser: true } },
    normalizedIdentifier: '+919876543210',
  });
});

test('does not reveal account existence through provider request errors', () => {
  const missingAccount = getUserFacingAuthError(new Error('User not found'), 'request');
  const existingAccount = getUserFacingAuthError(new Error('User already registered'), 'request');

  assert.equal(missingAccount, existingAccount);
  assert.equal(
    missingAccount,
    'A verification code could not be sent. Check the contact details and try again.',
  );
  assert.equal(
    getUserFacingAuthError(new Error('Invalid login credentials'), 'verify'),
    'The verification code is invalid or expired.',
  );
  assert.equal(
    getUserFacingAuthError(new Error('PKCE code verifier not found in storage'), 'complete'),
    'Open the newest sign-in link on the same device that requested it, or request a new email.',
  );
  assert.equal(
    getUserFacingAuthError(new Error('Invalid callback'), 'complete'),
    'The sign-in link is invalid or expired. Request a new email or use its current code.',
  );
  assert.equal(
    getUserFacingAuthError(new AuthInputError('Enter a valid email address.'), 'request'),
    'Enter a valid email address.',
  );
});
