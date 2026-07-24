export class AuthInputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AuthInputError';
  }
}

export const normalizeEmail = (value: string): string => {
  const email = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 254) {
    throw new AuthInputError('Enter a valid email address.');
  }

  return email;
};

export const normalizePhone = (value: string): string => {
  const phone = value.replace(/[\s()-]/gu, '');

  if (!/^\+[1-9]\d{7,14}$/u.test(phone)) {
    throw new AuthInputError(
      'Enter a phone number with country code, for example +91 98765 43210.',
    );
  }

  return phone;
};

export const normalizeOtp = (value: string): string => {
  const otp = value.replace(/\s/gu, '');

  if (!/^\d{6,8}$/u.test(otp)) {
    throw new AuthInputError('Enter the verification code from the newest SMS.');
  }

  return otp;
};

export const normalizePassword = (value: string): string => {
  if (value.length < 8) {
    throw new AuthInputError('Use at least 8 characters for your password.');
  }

  if (value.length > 72) {
    throw new AuthInputError('Use no more than 72 characters for your password.');
  }

  return value;
};
