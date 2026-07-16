import { getSafeMfaReturnPath } from '../../../lib/auth/return-path';
import { AuthCallbackClient } from './auth-callback-client';

export const dynamic = 'force-dynamic';

type CallbackPageProperties = Readonly<{
  searchParams: Promise<Readonly<{ next?: string | string[] }>>;
}>;

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function CallbackPage({ searchParams }: CallbackPageProperties) {
  const parameters = await searchParams;
  const nextPath = getSafeMfaReturnPath(firstValue(parameters.next), '/');
  return <AuthCallbackClient nextPath={nextPath} />;
}
