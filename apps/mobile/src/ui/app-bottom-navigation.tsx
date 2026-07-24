import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useComplaintCapture } from '../complaints/complaint-context';
import { CivicIcon, type CivicIconName } from './civic-icon';
import { useLocalization } from './localization';
import {
  normalizePrimaryNavigationItem,
  primaryNavigationItems,
  type PrimaryNavigationItem,
} from './primary-navigation';
import { mobileTheme } from './theme';

export type { PrimaryNavigationItem } from './primary-navigation';

export const AppBottomNavigation = ({ current }: Readonly<{ current: PrimaryNavigationItem }>) => {
  const capture = useComplaintCapture();
  const router = useRouter();
  const { t } = useLocalization();
  const selectedItem = normalizePrimaryNavigationItem(current);

  const openReport = async (): Promise<void> => {
    try {
      await capture.startDraft();
      router.push('/complaints/new');
    } catch {
      router.push('/home');
    }
  };

  const reportLabel = capture.state.draft === null ? t('reportIssue') : t('resumeSavedReport');

  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {primaryNavigationItems.slice(0, 2).map((item) => (
        <NavigationButton
          color={item.color}
          current={selectedItem === item.key}
          icon={item.icon}
          key={item.key}
          label={t(item.labelKey)}
          onPress={() => router.replace(item.route)}
        />
      ))}
      <Pressable
        accessibilityHint={reportLabel}
        accessibilityLabel={reportLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: capture.state.isBusy || !capture.state.isOnline }}
        disabled={capture.state.isBusy || !capture.state.isOnline}
        onPress={() => void openReport()}
        style={({ pressed }) => [
          styles.reportButton,
          pressed && styles.pressed,
          (capture.state.isBusy || !capture.state.isOnline) && styles.disabled,
        ]}
      >
        {capture.state.isBusy ? (
          <ActivityIndicator
            accessibilityLabel={t('loading')}
            color={mobileTheme.colors.white}
            size="small"
          />
        ) : (
          <CivicIcon color={mobileTheme.colors.white} name="plus" />
        )}
        <Text numberOfLines={1} style={styles.reportLabel}>
          {t('report')}
        </Text>
      </Pressable>
      {primaryNavigationItems.slice(2).map((item) => (
        <NavigationButton
          color={item.color}
          current={selectedItem === item.key}
          icon={item.icon}
          key={item.key}
          label={t(item.labelKey)}
          onPress={() => router.replace(item.route)}
        />
      ))}
    </View>
  );
};

const NavigationButton = ({
  color,
  current,
  icon,
  label,
  onPress,
}: Readonly<{
  color: string;
  current: boolean;
  icon: CivicIconName;
  label: string;
  onPress: () => void;
}>) => {
  const iconColor = current ? mobileTheme.colors.white : color;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: current }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        current && styles.currentItem,
        pressed && styles.pressed,
      ]}
    >
      <CivicIcon color={iconColor} name={icon} />
      <Text numberOfLines={1} style={[styles.label, current && styles.currentText]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    ...mobileTheme.shadow.floating,
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.nav,
    borderRadius: 32,
    flexDirection: 'row',
    marginBottom: 10,
    marginHorizontal: 14,
    minHeight: 64,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  currentItem: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  currentText: { color: mobileTheme.colors.white },
  disabled: { opacity: 0.5 },
  item: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
    minWidth: 48,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  label: {
    color: mobileTheme.colors.navMuted,
    fontSize: mobileTheme.type.nav,
    fontWeight: '700',
    marginTop: 2,
  },
  pressed: { opacity: 0.68 },
  reportButton: {
    ...mobileTheme.shadow.surface,
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.accent,
    borderColor: mobileTheme.colors.nav,
    borderRadius: 29,
    borderWidth: 4,
    height: 58,
    justifyContent: 'center',
    marginHorizontal: 2,
    marginTop: -20,
    width: 58,
  },
  reportLabel: {
    color: mobileTheme.colors.white,
    fontSize: 9,
    fontWeight: '800',
    marginTop: -1,
  },
});
