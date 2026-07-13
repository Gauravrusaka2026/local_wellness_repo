export type MobileAuthCallbackParameters = Readonly<{
  code?: string;
  tokenHash?: string;
}>;

export type MobileAuthCallback =
  Readonly<{ code: string; type: 'pkce' }> | Readonly<{ tokenHash: string; type: 'email_otp' }>;

export const resolveMobileAuthCallback = (
  parameters: MobileAuthCallbackParameters,
): MobileAuthCallback => {
  if (parameters.code) {
    return { code: parameters.code, type: 'pkce' };
  }

  if (parameters.tokenHash) {
    return { tokenHash: parameters.tokenHash, type: 'email_otp' };
  }

  throw new Error('The sign-in link is incomplete.');
};
