export const OTP_RESEND_COOLDOWN_MS = 30_000;

export const getOtpResendSecondsRemaining = (resendAvailableAt: number, now = Date.now()): number =>
  Math.max(0, Math.ceil((resendAvailableAt - now) / 1_000));
