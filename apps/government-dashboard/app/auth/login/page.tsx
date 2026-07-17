import { getSafeMfaReturnPath } from '../../../lib/auth/return-path';
import { OtpSignInForm } from './otp-sign-in-form';

type LoginPageProperties = Readonly<{
  searchParams: Promise<
    Readonly<{
      error?: string | string[];
      next?: string | string[];
      status?: string | string[];
    }>
  >;
}>;

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function LoginPage({ searchParams }: LoginPageProperties) {
  const parameters = await searchParams;
  const nextPath = getSafeMfaReturnPath(firstValue(parameters.next), '/');
  const status = firstValue(parameters.status);
  const accountNotice =
    status === 'switch-account'
      ? 'The previous account is signed out. Enter the official email for the account you want to use.'
      : status === 'signed-out'
        ? 'You are signed out of the Government Dashboard.'
        : null;

  return (
    <main className="centered-page">
      <OtpSignInForm
        accountNotice={accountNotice}
        callbackError={firstValue(parameters.error) === 'callback'}
        nextPath={nextPath}
      />
    </main>
  );
}
