import { Redirect } from 'expo-router';

import { useAuth } from '../src/auth/auth-context';
import { useLocalization } from '../src/ui/localization';
import { ErrorScreen, LoadingScreen } from '../src/ui/screen';

export default function Index() {
  const { state } = useAuth();
  const { t } = useLocalization();

  if (state.status === 'loading') {
    return <LoadingScreen label={t('restoringSession')} />;
  }

  if (state.status === 'configuration-error') {
    return <ErrorScreen message={state.message} title={t('appConfigurationRequired')} />;
  }

  return (
    <Redirect
      href={
        state.status === 'signed-in'
          ? '/home'
          : state.status === 'phone-verification-required'
            ? '/auth/phone-verification'
            : '/auth'
      }
    />
  );
}
