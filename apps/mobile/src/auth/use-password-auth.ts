import { useState } from 'react';

import {
  createEmailPasswordAccount,
  getUserFacingAuthError,
  sendPasswordRecoveryEmail,
  signInWithEmailPassword,
} from './auth-service';
import { AuthInputError } from './auth-input';

export type PasswordAuthMode = 'create-account' | 'forgot-password' | 'sign-in';

export const usePasswordAuth = () => {
  const [email, setEmailValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setModeValue] = useState<PasswordAuthMode>('sign-in');
  const [password, setPasswordValue] = useState('');
  const [passwordConfirmation, setPasswordConfirmationValue] = useState('');

  const clearFeedback = (): void => {
    setError(null);
    setMessage(null);
  };

  const setEmail = (value: string): void => {
    setEmailValue(value);
    clearFeedback();
  };

  const setPassword = (value: string): void => {
    setPasswordValue(value);
    clearFeedback();
  };

  const setPasswordConfirmation = (value: string): void => {
    setPasswordConfirmationValue(value);
    clearFeedback();
  };

  const setMode = (value: PasswordAuthMode): void => {
    setModeValue(value);
    setPasswordValue('');
    setPasswordConfirmationValue('');
    clearFeedback();
  };

  const submit = async (): Promise<'authenticated' | 'idle'> => {
    clearFeedback();
    setIsPending(true);
    try {
      if (mode === 'forgot-password') {
        const normalizedEmail = await sendPasswordRecoveryEmail(email);
        setMessage(
          `If an account exists for ${normalizedEmail}, its password recovery email is on the way.`,
        );
        return 'idle';
      }

      if (mode === 'create-account') {
        if (password !== passwordConfirmation)
          throw new AuthInputError('The passwords do not match.');
        const result = await createEmailPasswordAccount(email, password);
        if (result.status === 'email-confirmation-required') {
          setMessage(
            'Your account was created. Confirm the email using the newest Supabase message, then sign in to verify your phone.',
          );
          return 'idle';
        }
        return 'authenticated';
      }

      await signInWithEmailPassword(email, password);
      return 'authenticated';
    } catch (submitError) {
      setError(
        getUserFacingAuthError(submitError, mode === 'forgot-password' ? 'request' : 'password'),
      );
      return 'idle';
    } finally {
      setIsPending(false);
    }
  };

  return {
    email,
    error,
    isPending,
    message,
    mode,
    password,
    passwordConfirmation,
    setEmail,
    setMode,
    setPassword,
    setPasswordConfirmation,
    submit,
  } as const;
};
