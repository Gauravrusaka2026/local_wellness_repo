import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CivicIcon, type CivicIconName } from './civic-icon';
import { mobileTheme } from './theme';

export const PageIntro = ({
  eyebrow,
  subtitle,
  title,
}: Readonly<{ eyebrow?: string; subtitle?: string; title: string }>) => (
  <View style={styles.pageIntro}>
    {eyebrow === undefined ? null : <Text style={styles.eyebrow}>{eyebrow}</Text>}
    <Text accessibilityRole="header" style={styles.pageTitle}>
      {title}
    </Text>
    {subtitle === undefined ? null : <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

export const SectionHeader = ({
  actionLabel,
  onAction,
  title,
}: Readonly<{ actionLabel?: string; onAction?: () => void; title: string }>) => (
  <View style={styles.sectionHeader}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {title}
    </Text>
    {actionLabel === undefined || onAction === undefined ? null : (
      <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionAction}>
        <Text style={styles.sectionActionText}>{actionLabel}</Text>
      </Pressable>
    )}
  </View>
);

export const SurfaceCard = ({
  children,
  tone = 'neutral',
}: Readonly<{
  children: ReactNode;
  tone?: 'accent' | 'info' | 'neutral' | 'primary' | 'warning';
}>) => <View style={[styles.surface, toneStyles[tone]]}>{children}</View>;

export const IconTile = ({
  color = mobileTheme.colors.primary,
  icon,
  tone = 'primary',
}: Readonly<{
  color?: string;
  icon: CivicIconName;
  tone?: 'accent' | 'info' | 'primary';
}>) => (
  <View style={[styles.iconTile, iconToneStyles[tone]]}>
    <CivicIcon color={color} name={icon} />
  </View>
);

const toneStyles = StyleSheet.create({
  accent: { backgroundColor: mobileTheme.colors.accentSoft },
  info: { backgroundColor: mobileTheme.colors.infoSoft },
  neutral: { backgroundColor: mobileTheme.colors.surface },
  primary: { backgroundColor: mobileTheme.colors.primarySoft },
  warning: { backgroundColor: mobileTheme.colors.warningSoft },
});

const iconToneStyles = StyleSheet.create({
  accent: { backgroundColor: mobileTheme.colors.accentSoft },
  info: { backgroundColor: mobileTheme.colors.infoSoft },
  primary: { backgroundColor: mobileTheme.colors.primarySoft },
});

const styles = StyleSheet.create({
  eyebrow: {
    color: mobileTheme.colors.primary,
    fontSize: mobileTheme.type.caption,
    fontWeight: '900',
    letterSpacing: 1,
  },
  iconTile: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.medium,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pageIntro: { gap: 4 },
  pageTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.title,
    fontWeight: '900',
    lineHeight: 27,
  },
  sectionAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  sectionActionText: {
    color: mobileTheme.colors.primary,
    fontSize: mobileTheme.type.label,
    fontWeight: '800',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  sectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.heading,
    fontWeight: '900',
  },
  subtitle: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  surface: {
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    padding: mobileTheme.spacing[4],
  },
});
