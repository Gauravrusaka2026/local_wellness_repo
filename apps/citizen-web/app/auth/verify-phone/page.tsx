import { getSafeReturnPath } from '../../../lib/auth/return-path';
import { getCitizenPhoneMfaMode } from '../../../lib/environment';
import { PhoneVerificationForm } from './phone-verification-form';

type PhoneVerificationPageProperties = Readonly<{
  searchParams: Promise<Readonly<{ next?: string | string[] }>>;
}>;

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function PhoneVerificationPage({
  searchParams,
}: PhoneVerificationPageProperties) {
  const parameters = await searchParams;
  const nextPath = getSafeReturnPath(firstValue(parameters.next), '/account');

  return (
    <main className="centered-page">
      <PhoneVerificationForm
        isRequired={getCitizenPhoneMfaMode() === 'enforce'}
        nextPath={nextPath}
      />
    </main>
  );
}
