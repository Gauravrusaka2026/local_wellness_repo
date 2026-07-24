import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLocalization } from './localization';
import { mobileTheme } from './theme';

export const Screen = ({ children }: Readonly<{ children: ReactNode }>) => (
  <SafeAreaView style={styles.screen}>{children}</SafeAreaView>
);

export const LoadingScreen = ({ label }: Readonly<{ label: string }>) => (
  <Screen>
    <View accessibilityLiveRegion="polite" style={styles.centered}>
      <ActivityIndicator
        accessibilityLabel={label}
        color={mobileTheme.colors.primary}
        size="large"
      />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  </Screen>
);

export const ErrorScreen = ({
  action,
  message,
  title,
}: Readonly<{
  action?: Readonly<{ label: string; onPress: () => void }>;
  message: string;
  title?: string;
}>) => {
  const { t } = useLocalization();
  return (
    <Screen>
      <View accessibilityLiveRegion="assertive" style={styles.centered}>
        <Text accessibilityRole="header" style={styles.title}>
          {title ?? t('unableToContinue')}
        </Text>
        <Text accessibilityRole="alert" style={styles.errorText}>
          {message}
        </Text>
        {action === undefined ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: mobileTheme.colors.primary,
    borderRadius: mobileTheme.radius.small,
    minHeight: 46,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: mobileTheme.colors.white,
    fontSize: mobileTheme.type.body,
    fontWeight: '700',
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: mobileTheme.colors.danger,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
    textAlign: 'center',
  },
  screen: {
    backgroundColor: mobileTheme.colors.background,
    flex: 1,
  },
  statusText: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.body,
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.title,
    fontWeight: '900',
    textAlign: 'center',
  },
});
