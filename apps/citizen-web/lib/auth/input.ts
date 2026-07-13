export type AuthChannel = 'email' | 'phone';

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
    throw new AuthInputError('Enter a phone number with country code, such as +91 98765 43210.');
  }

  return phone;
};

export const normalizeOtp = (value: string): string => {
  const otp = value.replace(/\s/gu, '');

  if (!/^\d{6,8}$/u.test(otp)) {
    throw new AuthInputError('Enter the 6-digit verification code.');
  }

  return otp;
};
