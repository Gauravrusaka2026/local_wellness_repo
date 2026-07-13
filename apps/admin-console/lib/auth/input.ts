export class EmailInputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'EmailInputError';
  }
}

export const normalizeEmail = (value: string): string => {
  const email = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 254) {
    throw new EmailInputError('Enter a valid administrator email address.');
  }

  return email;
};
