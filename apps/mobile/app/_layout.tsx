import { Stack } from 'expo-router';

import { AuthProvider } from '../src/auth/auth-context';
import { ComplaintProvider } from '../src/complaints/complaint-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ComplaintProvider>
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
          <Stack.Screen name="home/index" options={{ headerShown: false, title: 'Home' }} />
          <Stack.Screen name="complaints/index" options={{ title: 'Your complaints' }} />
          <Stack.Screen name="complaints/new" options={{ title: 'Report an issue' }} />
          <Stack.Screen name="complaints/[complaintId]" options={{ title: 'Complaint' }} />
          <Stack.Screen name="profile/index" options={{ title: 'Your profile' }} />
        </Stack>
      </ComplaintProvider>
    </AuthProvider>
  );
}
