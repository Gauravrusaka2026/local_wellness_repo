import { ConfigurationError } from '@local-wellness/config';

import { AuthInputError } from './auth-input';
import {
  PhoneConfirmationConfigurationError,
  PhoneVerificationSecurityError,
} from './phone-verification';

export type AuthErrorOperation = 'complete' | 'password' | 'request' | 'verify';

export const getUserFacingAuthError = (
  error: unknown,
  operation: AuthErrorOperation = 'complete',
): string => {
  if (
    error instanceof AuthInputError ||
    error instanceof ConfigurationError ||
    error instanceof PhoneConfirmationConfigurationError ||
    error instanceof PhoneVerificationSecurityError
  ) {
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

    if (
      operation === 'password' &&
      (normalizedMessage.includes('fresh phone verification') ||
        normalizedMessage.includes('phone verification is required') ||
        normalizedMessage.includes('previously verified phone number is required'))
    ) {
      return 'A previously confirmed phone is required. Verify the newest SMS code, or contact support if you no longer control that phone.';
    }

    if (
      operation === 'password' &&
      normalizedMessage.includes('password-change session has expired')
    ) {
      return 'This password-change session has expired. Sign in or request a new recovery email.';
    }

    if (
      operation === 'password' &&
      normalizedMessage.includes('password changed') &&
      normalizedMessage.includes('could not clear its session')
    ) {
      return 'Your password changed, but this device could not sign out safely. Close the app before continuing and review active sessions.';
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
