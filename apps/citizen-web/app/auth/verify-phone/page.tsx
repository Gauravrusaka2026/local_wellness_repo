import { redirect } from 'next/navigation';

import { getVerifiedCitizenSession } from '../../../lib/api/client';
import { getCitizenAccountLabel } from '../../../lib/auth/presentation';
import { getSafeReturnPath } from '../../../lib/auth/return-path';
import { getCitizenPhoneMfaMode } from '../../../lib/environment';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { PhoneVerificationForm } from './phone-verification-form';

type PhoneVerificationPageProperties = Readonly<{
  searchParams: Promise<Readonly<{ next?: string | string[] }>>;
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

export default async function PhoneVerificationPage({
  searchParams,
}: PhoneVerificationPageProperties) {
  const parameters = await searchParams;
  const nextPath = getSafeReturnPath(firstValue(parameters.next), '/account');
  const currentAccount = await getCurrentAccount();

  if (currentAccount === null) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <main className="centered-page">
      <PhoneVerificationForm
        accountContact={currentAccount}
        isRequired={getCitizenPhoneMfaMode() === 'enforce'}
        nextPath={nextPath}
      />
    </main>
  );
}
