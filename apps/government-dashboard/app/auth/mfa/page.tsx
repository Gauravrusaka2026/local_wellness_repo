import { getSafeMfaReturnPath } from '../../../lib/auth/return-path';
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

  return (
    <main className="centered-page">
      <MfaForm nextPath={nextPath} />
    </main>
  );
}
