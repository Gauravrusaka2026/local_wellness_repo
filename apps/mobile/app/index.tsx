import { Redirect } from 'expo-router';

import { useAuth } from '../src/auth/auth-context';
import { ErrorScreen, LoadingScreen } from '../src/ui/screen';

export default function Index() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return <LoadingScreen label="Restoring your secure session…" />;
  }

  if (state.status === 'configuration-error') {
    return <ErrorScreen message={state.message} title="App configuration required" />;
  }

  return <Redirect href={state.status === 'signed-in' ? '/home' : '/auth'} />;
}
