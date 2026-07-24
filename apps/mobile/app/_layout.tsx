import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/auth/auth-context';
import { ComplaintProvider } from '../src/complaints/complaint-context';
import { LocalizationProvider, useLocalization } from '../src/ui/localization';
import { mobileTheme } from '../src/ui/theme';

const detailScreenOptions = {} as const;

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocalizationProvider>
        <AuthProvider>
          <ComplaintProvider>
            <RootNavigator />
          </ComplaintProvider>
        </AuthProvider>
      </LocalizationProvider>
    </SafeAreaProvider>
  );
}

const RootNavigator = () => {
  const { t } = useLocalization();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: mobileTheme.colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: mobileTheme.colors.background },
        headerTintColor: mobileTheme.colors.text,
        headerTitleStyle: { fontSize: 17, fontWeight: '800' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/index" options={{ headerShown: false, title: t('signIn') }} />
      <Stack.Screen
        name="auth/phone-verification"
        options={{ headerBackVisible: false, title: t('verifyPhone') }}
      />
      <Stack.Screen
        name="auth/reset-password"
        options={{ headerBackVisible: false, title: t('changePassword') }}
      />
      <Stack.Screen name="auth/change-password" options={{ title: t('changePassword') }} />
      <Stack.Screen
        name="auth/callback"
        options={{ headerBackVisible: false, title: t('signIn') }}
      />
      <Stack.Screen name="home/index" options={{ headerShown: false, title: t('home') }} />
      <Stack.Screen
        name="complaints/index"
        options={{ headerShown: false, title: t('yourComplaints') }}
      />
      <Stack.Screen
        name="complaints/new"
        options={{ ...detailScreenOptions, title: t('reportIssue') }}
      />
      <Stack.Screen
        name="complaints/result"
        options={{ ...detailScreenOptions, title: t('report') }}
      />
      <Stack.Screen
        name="complaints/[complaintId]"
        options={{ ...detailScreenOptions, title: t('complaint') }}
      />
      <Stack.Screen
        name="notifications/index"
        options={{ ...detailScreenOptions, title: t('notifications') }}
      />
      <Stack.Screen
        name="profile/index"
        options={{ ...detailScreenOptions, title: t('profileTitle') }}
      />
      <Stack.Screen
        name="transparency/index"
        options={{ headerShown: false, title: t('community') }}
      />
      <Stack.Screen
        name="transparency/[publicId]"
        options={{ ...detailScreenOptions, title: t('complaint') }}
      />
      <Stack.Screen name="governance/index" options={{ headerShown: false }} />
      <Stack.Screen name="menu/index" options={{ headerShown: false }} />
    </Stack>
  );
};
