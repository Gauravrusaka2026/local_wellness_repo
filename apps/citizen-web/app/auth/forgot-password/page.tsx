import { ForgotPasswordForm } from './forgot-password-form';

type ForgotPasswordPageProperties = Readonly<{
  searchParams: Promise<Readonly<{ email?: string | string[] }>>;
}>;

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProperties) {
  const parameters = await searchParams;
  const initialEmail = firstValue(parameters.email)?.slice(0, 254) ?? '';

  return (
    <main className="centered-page">
      <ForgotPasswordForm initialEmail={initialEmail} />
    </main>
  );
}
