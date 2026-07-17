import { getVerifiedCitizenSession } from '../../../lib/api/client';
import { getCitizenAccountLabel } from '../../../lib/auth/presentation';
import { getSafeReturnPath } from '../../../lib/auth/return-path';
import { getCitizenPhoneMfaMode } from '../../../lib/environment';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { PasswordAuthForm } from './password-auth-form';

type LoginPageProperties = Readonly<{
  searchParams: Promise<
    Readonly<{
      error?: string | string[];
      email?: string | string[];
      next?: string | string[];
      reset?: string | string[];
    }>
  >;
}>;

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const getCurrentAccount = async (): Promise<string | null> => {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await getVerifiedCitizenSession(supabase);
    return getCitizenAccountLabel(session.identity);
  } catch {
    return null;
  }
};

export default async function LoginPage({ searchParams }: LoginPageProperties) {
  const parameters = await searchParams;
  const nextPath = getSafeReturnPath(firstValue(parameters.next), '/account');
  const initialEmail = firstValue(parameters.email)?.slice(0, 254) ?? '';
  const currentAccount = await getCurrentAccount();

  return (
    <main className="centered-page">
      <PasswordAuthForm
        callbackError={firstValue(parameters.error) === 'callback'}
        currentAccount={currentAccount}
        initialEmail={initialEmail}
        nextPath={nextPath}
        passwordReset={firstValue(parameters.reset) === 'success'}
        phoneMfaMode={getCitizenPhoneMfaMode()}
      />
    </main>
  );
}
