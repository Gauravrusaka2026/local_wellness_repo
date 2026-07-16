import assert from 'node:assert/strict';
import test from 'node:test';

import { getUserFacingAuthError } from '../src/auth/auth-error';
import { AuthInputError } from '../src/auth/auth-input';

test('presents safe operation-specific password authentication errors', () => {
  assert.equal(
    getUserFacingAuthError(new Error('Invalid login credentials'), 'password'),
    'The email or password is incorrect.',
  );
  assert.equal(
    getUserFacingAuthError(new Error('Provider unavailable'), 'password'),
    'Email and password authentication could not be completed. Please try again.',
  );
  assert.equal(
    getUserFacingAuthError(new AuthInputError('Enter a valid email address.'), 'password'),
    'Enter a valid email address.',
  );
});

test('does not expose account existence through password-recovery request errors', () => {
  const missingAccount = getUserFacingAuthError(new Error('User not found'), 'request');
  const existingAccount = getUserFacingAuthError(new Error('User already registered'), 'request');

  assert.equal(missingAccount, existingAccount);
  assert.equal(
    missingAccount,
    'A recovery email could not be sent. Check the email address and try again.',
  );
});

test('keeps reviewed legacy callback failures safe for existing account links', () => {
  assert.equal(
    getUserFacingAuthError(new Error('PKCE code verifier not found in storage'), 'complete'),
    'Open the newest sign-in link on the same device that requested it, or request a new email.',
  );
  assert.equal(
    getUserFacingAuthError(new Error('Invalid callback'), 'complete'),
    'The secure email link is invalid or expired. Request a new email.',
  );
});
