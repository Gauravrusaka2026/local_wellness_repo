import { getSafeReturnPath } from '../../../lib/auth/return-path';
import { OtpSignInForm } from './otp-sign-in-form';

type LoginPageProperties = Readonly<{
  searchParams: Promise<Readonly<{ error?: string | string[]; next?: string | string[] }>>;
}>;

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function LoginPage({ searchParams }: LoginPageProperties) {
  const parameters = await searchParams;
  const nextPath = getSafeReturnPath(firstValue(parameters.next), '/account');

  return (
    <main className="centered-page">
      <OtpSignInForm
        callbackError={firstValue(parameters.error) === 'callback'}
        nextPath={nextPath}
      />
    </main>
  );
}
