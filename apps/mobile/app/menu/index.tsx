import type { Href } from 'expo-router';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../../src/auth/auth-context';
import { getUserFacingAuthError } from '../../src/auth/auth-service';
import { AppBottomNavigation } from '../../src/ui/app-bottom-navigation';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

export default function MenuScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title="App configuration required" />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'mfa-required') return <Redirect href="/auth/phone-verification" />;

  const identifier = auth.state.session.user.email ?? auth.state.session.user.phone ?? 'Citizen';

  const signOut = async (): Promise<void> => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await auth.signOut();
    } catch (error) {
      setSignOutError(getUserFacingAuthError(error));
      setIsSigningOut(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>LOCAL WELLNESS</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Menu
          </Text>
          <Text numberOfLines={1} style={styles.identifier}>
            Signed in as {identifier}
          </Text>
        </View>

        <MenuSection title="My activity">
          <MenuLink
            description="See receipts, progress and resolution updates"
            glyph="☷"
            label="Your complaints"
            onPress={() => router.push('/complaints')}
          />
          <MenuDivider />
          <MenuLink
            description="Read government messages and status alerts"
            glyph="🔔"
            label="Notifications"
            onPress={() => router.push('/notifications')}
          />
        </MenuSection>

        <MenuSection title="Explore">
          <MenuLink
            description="Find verified municipality, ward and office coverage"
            glyph="◎"
            label="Governing bodies"
            onPress={() => router.push('/governance' as Href)}
          />
          <MenuDivider />
          <MenuLink
            description="Explore reviewed, privacy-protected public reports"
            glyph="⌖"
            label="Nearby reports"
            onPress={() => router.push('/transparency')}
          />
        </MenuSection>

        <MenuSection title="Account">
          <MenuLink
            description="Update your name and preferred language"
            glyph="○"
            label="Profile"
            onPress={() => router.push('/profile')}
          />
        </MenuSection>

        <View style={styles.emergencyCard}>
          <View style={styles.emergencyCopy}>
            <Text style={styles.emergencyTitle}>Emergency help</Text>
            <Text style={styles.emergencyText}>For immediate danger, call 112.</Text>
          </View>
          <Pressable
            accessibilityHint="Opens your phone app with emergency number 112"
            accessibilityRole="button"
            onPress={() => void Linking.openURL('tel:112')}
            style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
          >
            <Text style={styles.callButtonText}>Call 112</Text>
          </Pressable>
        </View>

        <View style={styles.trustCard}>
          <Text style={styles.trustTitle}>Private by default</Text>
          <Text style={styles.trustText}>Exact locations and original evidence stay private.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSigningOut }}
          disabled={isSigningOut}
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        >
          {isSigningOut ? (
            <ActivityIndicator accessibilityLabel="Signing out" color="#a12626" />
          ) : (
            <Text style={styles.signOutText}>Sign out</Text>
          )}
        </Pressable>
        {signOutError === null ? null : (
          <Text accessibilityRole="alert" style={styles.signOutError}>
            {signOutError}
          </Text>
        )}

        <Text style={styles.versionText}>Local Wellness · Citizen application</Text>
      </ScrollView>
      <AppBottomNavigation current="menu" />
    </Screen>
  );
}

const MenuSection = ({ children, title }: Readonly<{ children: ReactNode; title: string }>) => (
  <View style={styles.sectionBlock}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {title}
    </Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

const MenuLink = ({
  description,
  glyph,
  label,
  onPress,
}: Readonly<{
  description: string;
  glyph: string;
  label: string;
  onPress: () => void;
}>) => (
  <Pressable
    accessibilityHint={description}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.menuLink, pressed && styles.pressed]}
  >
    <View style={styles.menuIcon}>
      <Text accessibilityElementsHidden style={styles.menuIconText}>
        {glyph}
      </Text>
    </View>
    <View style={styles.menuCopy}>
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    <Text accessibilityElementsHidden style={styles.chevron}>
      ›
    </Text>
  </Pressable>
);

const MenuDivider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  callButton: {
    alignItems: 'center',
    backgroundColor: '#a33b18',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 15,
  },
  callButtonText: { color: '#ffffff', fontWeight: '900' },
  chevron: { color: '#4b755d', fontSize: 27 },
  content: { gap: 16, padding: 18, paddingBottom: 32 },
  divider: { backgroundColor: '#e4ebe6', height: 1, marginLeft: 64 },
  emergencyCard: {
    alignItems: 'center',
    backgroundColor: '#fff2eb',
    borderColor: '#ffd1be',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  emergencyCopy: { flex: 1, gap: 5 },
  emergencyText: { color: '#7b3c22', fontSize: 13, lineHeight: 19 },
  emergencyTitle: { color: '#8e3315', fontSize: 17, fontWeight: '900' },
  eyebrow: { color: '#2b774c', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  header: { gap: 5, marginTop: 8 },
  identifier: { color: '#65766b', fontSize: 14 },
  menuCopy: { flex: 1 },
  menuIcon: {
    alignItems: 'center',
    backgroundColor: '#eaf4ed',
    borderRadius: 13,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  menuIconText: { color: '#1e6a3f', fontSize: 22, fontWeight: '700' },
  menuLabel: { color: '#183b28', fontSize: 16, fontWeight: '800' },
  menuLink: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 60, padding: 10 },
  pressed: { opacity: 0.68 },
  sectionBlock: { gap: 9 },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e0e8e2',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: { color: '#486052', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  signOutButton: {
    alignItems: 'center',
    borderColor: '#c65a5a',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    padding: 12,
  },
  signOutError: { color: '#992828', lineHeight: 21, textAlign: 'center' },
  signOutText: { color: '#a12626', fontSize: 16, fontWeight: '900' },
  title: { color: '#153b27', fontSize: 30, fontWeight: '900' },
  trustCard: { backgroundColor: '#edf7f0', borderRadius: 17, gap: 6, padding: 16 },
  trustText: { color: '#4e6857', lineHeight: 21 },
  trustTitle: { color: '#1a5935', fontSize: 16, fontWeight: '900' },
  versionText: { color: '#819087', fontSize: 12, textAlign: 'center' },
});
