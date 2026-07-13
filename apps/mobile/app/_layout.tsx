import { Stack } from 'expo-router';

import { AuthProvider } from '../src/auth/auth-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#f7faf7' },
          headerStyle: { backgroundColor: '#f7faf7' },
          headerTintColor: '#14281d',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/index" options={{ headerShown: false, title: 'Sign in' }} />
        <Stack.Screen
          name="auth/callback"
          options={{ headerBackVisible: false, title: 'Completing sign in' }}
        />
        <Stack.Screen name="profile/index" options={{ title: 'Your profile' }} />
      </Stack>
    </AuthProvider>
  );
}
