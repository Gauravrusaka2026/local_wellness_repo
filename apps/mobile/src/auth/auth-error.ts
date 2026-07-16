import { ConfigurationError } from '@local-wellness/config';

import { AuthInputError } from './auth-input';

export type AuthErrorOperation = 'complete' | 'password' | 'request' | 'verify';

export const getUserFacingAuthError = (
  error: unknown,
  operation: AuthErrorOperation = 'complete',
): string => {
  if (error instanceof AuthInputError || error instanceof ConfigurationError) {
    return error.message;
  }

  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes('rate') || normalizedMessage.includes('too many')) {
      return 'Too many attempts. Wait a moment before trying again.';
    }

    if (operation === 'password' && normalizedMessage.includes('invalid login credentials')) {
      return 'The email or password is incorrect.';
    }

    if (operation === 'complete' && normalizedMessage.includes('code verifier')) {
      return 'Open the newest sign-in link on the same device that requested it, or request a new email.';
    }

    if (
      operation !== 'request' &&
      (normalizedMessage.includes('expired') || normalizedMessage.includes('invalid'))
    ) {
      return operation === 'complete'
        ? 'The secure email link is invalid or expired. Request a new email.'
        : 'The verification code is invalid or expired.';
    }
  }

  return operation === 'request'
    ? 'A recovery email could not be sent. Check the email address and try again.'
    : operation === 'password'
      ? 'Email and password authentication could not be completed. Please try again.'
      : 'Authentication could not be completed. Please try again.';
};
