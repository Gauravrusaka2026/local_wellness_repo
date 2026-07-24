import { useRef, useState } from 'react';

import {
  createEmailPasswordAccount,
  getUserFacingAuthError,
  sendPasswordRecoveryEmail,
  signInWithEmailPassword,
} from './auth-service';
import { AuthInputError } from './auth-input';
import { useLocalization } from '../ui/localization';

export type PasswordAuthMode = 'create-account' | 'forgot-password' | 'sign-in';

export const usePasswordAuth = () => {
  const { t } = useLocalization();
  const pending = useRef(false);
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
    if (pending.current) return 'idle';
    pending.current = true;
    clearFeedback();
    setIsPending(true);
    try {
      if (mode === 'forgot-password') {
        const normalizedEmail = await sendPasswordRecoveryEmail(email);
        setMessage(t('recoveryEmailSentIfAccount', { email: normalizedEmail }));
        return 'idle';
      }

      if (mode === 'create-account') {
        if (password !== passwordConfirmation) throw new AuthInputError(t('passwordsDoNotMatch'));
        const result = await createEmailPasswordAccount(email, password);
        if (result.status === 'email-confirmation-required') {
          setMessage(t('accountCreatedConfirmEmail'));
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
      pending.current = false;
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
