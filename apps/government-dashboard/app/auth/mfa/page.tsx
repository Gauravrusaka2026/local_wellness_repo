import { redirect } from 'next/navigation';

import {
  AuthenticationRequiredError,
  getGovernmentAccountLabel,
  getVerifiedGovernmentSession,
} from '../../../lib/api/client';
import { getSafeMfaReturnPath } from '../../../lib/auth/return-path';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { MfaForm } from './mfa-form';

export const dynamic = 'force-dynamic';

type MfaPageProperties = Readonly<{
  searchParams: Promise<Readonly<{ next?: string | string[] }>>;
}>;

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function MfaPage({ searchParams }: MfaPageProperties) {
  const parameters = await searchParams;
  const nextPath = getSafeMfaReturnPath(firstValue(parameters.next), '/');
  const supabase = await createServerSupabaseClient();
  let accountLabel: string;

  try {
    accountLabel = getGovernmentAccountLabel(
      (await getVerifiedGovernmentSession(supabase)).identity,
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
    }

    throw error;
  }

  return (
    <main className="centered-page">
      <MfaForm accountLabel={accountLabel} nextPath={nextPath} />
    </main>
  );
}
