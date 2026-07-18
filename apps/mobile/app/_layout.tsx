import type { Href } from 'expo-router';
import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/auth/auth-context';
import { ComplaintProvider } from '../src/complaints/complaint-context';

const HeaderMenuButton = () => (
  <Link href={'/menu' as Href} asChild>
    <Pressable
      accessibilityLabel="Open menu"
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
    >
      <Text accessibilityElementsHidden style={styles.menuGlyph}>
        ≡
      </Text>
    </Pressable>
  </Link>
);

const detailScreenOptions = {
  headerRight: HeaderMenuButton,
} as const;

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ComplaintProvider>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: '#f7faf7' },
              headerStyle: { backgroundColor: '#f7faf7' },
              headerTintColor: '#14281d',
              headerTitleStyle: { fontWeight: '800' },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth/index" options={{ headerShown: false, title: 'Sign in' }} />
            <Stack.Screen
              name="auth/phone-verification"
              options={{ headerBackVisible: false, title: 'Verify phone' }}
            />
            <Stack.Screen
              name="auth/reset-password"
              options={{ headerBackVisible: false, title: 'Reset password' }}
            />
            <Stack.Screen
              name="auth/callback"
              options={{ headerBackVisible: false, title: 'Completing sign in' }}
            />
            <Stack.Screen name="home/index" options={{ headerShown: false, title: 'Home' }} />
            <Stack.Screen
              name="complaints/index"
              options={{ headerShown: false, title: 'Your complaints' }}
            />
            <Stack.Screen
              name="complaints/new"
              options={{ ...detailScreenOptions, title: 'Report an issue' }}
            />
            <Stack.Screen
              name="complaints/[complaintId]"
              options={{ ...detailScreenOptions, title: 'Complaint' }}
            />
            <Stack.Screen
              name="notifications/index"
              options={{ ...detailScreenOptions, title: 'Notifications' }}
            />
            <Stack.Screen
              name="profile/index"
              options={{ ...detailScreenOptions, title: 'Your profile' }}
            />
            <Stack.Screen
              name="transparency/index"
              options={{ headerShown: false, title: 'Community' }}
            />
            <Stack.Screen
              name="transparency/[publicId]"
              options={{ ...detailScreenOptions, title: 'Public report' }}
            />
            <Stack.Screen name="governance/index" options={{ headerShown: false }} />
            <Stack.Screen name="menu/index" options={{ headerShown: false }} />
          </Stack>
        </ComplaintProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  menuButtonPressed: { backgroundColor: '#e7efe9' },
  menuGlyph: { color: '#1d633b', fontSize: 25, fontWeight: '800' },
});
