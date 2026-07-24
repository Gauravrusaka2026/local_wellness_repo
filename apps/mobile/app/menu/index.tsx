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
import { CivicIcon, type CivicIconName } from '../../src/ui/civic-icon';
import { PageIntro } from '../../src/ui/compact-ui';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

export default function MenuScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { t } = useLocalization();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (auth.state.status === 'loading') return <LoadingScreen label={t('restoringSession')} />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title={t('appConfigurationRequired')} />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'phone-verification-required') {
    return <Redirect href="/auth/phone-verification" />;
  }

  const identifier = auth.state.session.user.email ?? auth.state.session.user.phone ?? t('citizen');

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
          <PageIntro
            eyebrow={t('appName').toUpperCase()}
            subtitle={t('signedInAs', { identifier })}
            title={t('menu')}
          />
        </View>

        <MenuSection title={t('myActivity')}>
          <MenuLink
            description={t('yourComplaintsHint')}
            icon="complaint"
            label={t('yourComplaints')}
            onPress={() => router.push('/complaints')}
          />
          <MenuDivider />
          <MenuLink
            description={t('notificationsHint')}
            icon="bell"
            label={t('notifications')}
            onPress={() => router.push('/notifications')}
            tone="info"
          />
        </MenuSection>

        <MenuSection title={t('explore')}>
          <MenuLink
            description={t('governingBodiesHint')}
            icon="office"
            label={t('governingBodies')}
            onPress={() => router.push('/governance' as Href)}
            tone="accent"
          />
          <MenuDivider />
          <MenuLink
            description={t('nearbyReportsHint')}
            icon="community"
            label={t('nearbyReports')}
            onPress={() => router.push('/transparency')}
            tone="info"
          />
        </MenuSection>

        <MenuSection title={t('account')}>
          <MenuLink
            description={t('profileHint')}
            icon="profile"
            label={t('profile')}
            onPress={() => router.push('/profile')}
          />
        </MenuSection>

        <View style={styles.emergencyCard}>
          <View style={styles.emergencyCopy}>
            <Text style={styles.emergencyTitle}>{t('emergencyHelp')}</Text>
            <Text style={styles.emergencyText}>{t('emergencyBody')}</Text>
          </View>
          <Pressable
            accessibilityHint={t('call112Hint')}
            accessibilityRole="button"
            onPress={() => void Linking.openURL('tel:112')}
            style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
          >
            <Text style={styles.callButtonText}>{t('call112')}</Text>
          </Pressable>
        </View>

        <View style={styles.trustCard}>
          <Text style={styles.trustTitle}>{t('reportChoiceTitle')}</Text>
          <Text style={styles.trustText}>{t('reportChoiceBody')}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSigningOut }}
          disabled={isSigningOut}
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        >
          {isSigningOut ? (
            <ActivityIndicator
              accessibilityLabel={t('signingOut')}
              color={mobileTheme.colors.danger}
            />
          ) : (
            <View style={styles.signOutContent}>
              <CivicIcon color={mobileTheme.colors.danger} name="sign-out" />
              <Text style={styles.signOutText}>{t('signOut')}</Text>
            </View>
          )}
        </Pressable>
        {signOutError === null ? null : (
          <Text accessibilityRole="alert" style={styles.signOutError}>
            {signOutError}
          </Text>
        )}

        <Text style={styles.versionText}>
          {t('appName')} · {t('appCitizenLabel')}
        </Text>
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
  icon,
  label,
  onPress,
  tone = 'primary',
}: Readonly<{
  description: string;
  icon: CivicIconName;
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'info' | 'primary';
}>) => (
  <Pressable
    accessibilityHint={description}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.menuLink, pressed && styles.pressed]}
  >
    <View
      style={[
        styles.menuIcon,
        tone === 'accent'
          ? styles.menuIconAccent
          : tone === 'info'
            ? styles.menuIconInfo
            : styles.menuIconPrimary,
      ]}
    >
      <CivicIcon
        color={
          tone === 'accent'
            ? mobileTheme.colors.accent
            : tone === 'info'
              ? mobileTheme.colors.info
              : mobileTheme.colors.primary
        }
        name={icon}
      />
    </View>
    <View style={styles.menuCopy}>
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    <CivicIcon color={mobileTheme.colors.muted} name="chevron-right" />
  </Pressable>
);

const MenuDivider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  callButton: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: mobileTheme.radius.medium,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 15,
  },
  callButtonText: { color: mobileTheme.colors.white, fontSize: 14, fontWeight: '900' },
  content: { gap: 14, padding: 16, paddingBottom: 24 },
  divider: { backgroundColor: mobileTheme.colors.border, height: 1, marginLeft: 64 },
  emergencyCard: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.accentSoft,
    borderColor: '#ffd1be',
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  emergencyCopy: { flex: 1, gap: 5 },
  emergencyText: {
    color: '#7b3c22',
    fontSize: mobileTheme.type.helper,
    lineHeight: 18,
  },
  emergencyTitle: {
    color: '#8e3315',
    fontSize: mobileTheme.type.heading,
    fontWeight: '900',
  },
  header: { marginTop: 4 },
  menuCopy: { flex: 1 },
  menuIcon: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.medium,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  menuIconAccent: { backgroundColor: mobileTheme.colors.accentSoft },
  menuIconInfo: { backgroundColor: mobileTheme.colors.infoSoft },
  menuIconPrimary: { backgroundColor: mobileTheme.colors.primarySoft },
  menuLabel: { color: mobileTheme.colors.text, fontSize: 14, fontWeight: '800' },
  menuLink: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 60, padding: 10 },
  pressed: { opacity: 0.68 },
  sectionBlock: { gap: 9 },
  sectionCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.helper,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: mobileTheme.colors.danger,
    borderRadius: mobileTheme.radius.medium,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    padding: 12,
  },
  signOutContent: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  signOutError: {
    color: mobileTheme.colors.danger,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
    textAlign: 'center',
  },
  signOutText: { color: mobileTheme.colors.danger, fontSize: 14, fontWeight: '900' },
  trustCard: {
    backgroundColor: mobileTheme.colors.primarySoft,
    borderRadius: mobileTheme.radius.large,
    gap: 6,
    padding: 14,
  },
  trustText: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  trustTitle: {
    color: mobileTheme.colors.primaryDark,
    fontSize: mobileTheme.type.heading,
    fontWeight: '900',
  },
  versionText: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.helper,
    textAlign: 'center',
  },
});
