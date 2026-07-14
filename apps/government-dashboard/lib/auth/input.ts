export class EmailInputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'EmailInputError';
  }
}

export class OtpInputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'OtpInputError';
  }
}

export const normalizeEmail = (value: string): string => {
  const email = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 254) {
    throw new EmailInputError('Enter a valid official email address.');
  }

  return email;
};

export const normalizeOtp = (value: string): string => {
  const otp = value.replace(/\s/gu, '');

  if (!/^\d{6,8}$/u.test(otp)) {
    throw new OtpInputError('Enter the 6-digit verification code.');
  }

  return otp;
};
