import { useState } from 'react';

import { getUserFacingAuthError, requestOtp, verifyOtp } from './auth-service';
import type { AuthChannel, CitizenAuthMode } from './auth-input';

type SignInStep = 'request' | 'verify';

export const useOtpSignIn = () => {
  const [channel, setChannelState] = useState<AuthChannel>('phone');
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifierState] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [mode, setModeState] = useState<CitizenAuthMode>('sign_in');
  const [normalizedIdentifier, setNormalizedIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<SignInStep>('request');

  const setChannel = (nextChannel: AuthChannel): void => {
    setChannelState(nextChannel);
    setError(null);
    setIdentifierState('');
    setNormalizedIdentifier('');
    setOtp('');
    setStep('request');
  };

  const setIdentifier = (value: string): void => {
    setIdentifierState(value);
    setError(null);
  };

  const setMode = (nextMode: CitizenAuthMode): void => {
    setModeState(nextMode);
    setError(null);
    setIdentifierState('');
    setNormalizedIdentifier('');
    setOtp('');
    setStep('request');
  };

  const request = async (): Promise<void> => {
    setError(null);
    setIsPending(true);

    try {
      const normalizedValue = await requestOtp(channel, identifier, mode);
      setNormalizedIdentifier(normalizedValue);
      setStep('verify');
    } catch (requestError) {
      setError(getUserFacingAuthError(requestError, 'request'));
    } finally {
      setIsPending(false);
    }
  };

  const verify = async (): Promise<boolean> => {
    setError(null);
    setIsPending(true);

    try {
      await verifyOtp(channel, normalizedIdentifier, otp);
      return true;
    } catch (verificationError) {
      setError(getUserFacingAuthError(verificationError, 'verify'));
      return false;
    } finally {
      setIsPending(false);
    }
  };

  const startAgain = (): void => {
    setError(null);
    setOtp('');
    setStep('request');
  };

  return {
    channel,
    error,
    identifier,
    isPending,
    mode,
    normalizedIdentifier,
    otp,
    request,
    setChannel,
    setIdentifier,
    setMode,
    setOtp,
    startAgain,
    step,
    verify,
  } as const;
};
