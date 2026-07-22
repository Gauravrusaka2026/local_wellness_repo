import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useComplaintCapture } from '../complaints/complaint-context';

export type PrimaryNavigationItem = 'community' | 'complaints' | 'governance' | 'home' | 'menu';

const navigationItems = [
  { icon: 'home', color: '#6ee7b7', key: 'home', label: 'Home', route: '/home' },
  {
    icon: 'complaints',
    color: '#93c5fd',
    key: 'complaints',
    label: 'Complaints',
    route: '/complaints',
  },
  {
    icon: 'community',
    color: '#fdba74',
    key: 'community',
    label: 'Community',
    route: '/transparency',
  },
  { icon: 'more', color: '#86efac', key: 'menu', label: 'More', route: '/menu' },
] as const;

export const AppBottomNavigation = ({ current }: Readonly<{ current: PrimaryNavigationItem }>) => {
  const capture = useComplaintCapture();
  const router = useRouter();

  const openReport = async (): Promise<void> => {
    try {
      await capture.startDraft();
      router.push('/complaints/new');
    } catch {
      router.push('/home');
    }
  };

  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {navigationItems.slice(0, 2).map((item) => (
        <NavigationButton
          current={current === item.key}
          color={item.color}
          icon={item.icon}
          key={item.key}
          label={item.label}
          onPress={() => router.replace(item.route as Href)}
        />
      ))}
      <Pressable
        accessibilityHint="Starts a new report or resumes your saved report"
        accessibilityLabel={
          capture.state.draft === null ? 'Report an issue' : 'Resume saved report'
        }
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
          <ActivityIndicator accessibilityLabel="Preparing report" color="#ffffff" size="small" />
        ) : (
          <View accessibilityElementsHidden style={styles.reportGlyph}>
            <View style={styles.reportCrossHorizontal} />
            <View style={styles.reportCrossVertical} />
          </View>
        )}
        <Text style={styles.reportLabel}>Report</Text>
      </Pressable>
      {navigationItems.slice(2).map((item) => (
        <NavigationButton
          current={current === item.key}
          color={item.color}
          icon={item.icon}
          key={item.key}
          label={item.label}
          onPress={() => router.replace(item.route as Href)}
        />
      ))}
    </View>
  );
};

const NavigationButton = ({
  current,
  color,
  icon,
  label,
  onPress,
}: Readonly<{
  color: string;
  current: boolean;
  icon: string;
  label: string;
  onPress: () => void;
}>) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="tab"
    accessibilityState={{ selected: current }}
    onPress={onPress}
    style={({ pressed }) => [styles.item, current && styles.currentItem, pressed && styles.pressed]}
  >
    <NavIcon color={color} icon={icon} selected={current} />
    <Text style={[styles.label, current && styles.currentText]}>{label}</Text>
  </Pressable>
);

const NavIcon = ({
  color,
  icon,
  selected,
}: Readonly<{ color: string; icon: string; selected: boolean }>) => {
  const fill = selected ? '#25df72' : color;
  if (icon === 'home')
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.iconBox}
      >
        <View style={[styles.homeRoof, { backgroundColor: fill }]} />
        <View style={[styles.homeBody, { backgroundColor: fill }]} />
        <View style={styles.homeDoor} />
      </View>
    );
  if (icon === 'complaints')
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.iconBox, styles.documentIcon, { borderColor: fill }]}
      >
        <View style={[styles.documentLine, { backgroundColor: fill }]} />
        <View style={[styles.documentLine, { backgroundColor: fill }]} />
        <View style={[styles.documentLineShort, { backgroundColor: fill }]} />
      </View>
    );
  if (icon === 'community')
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.communityIcon}
      >
        <View style={[styles.personHead, { backgroundColor: fill }]} />
        <View style={[styles.personBody, { backgroundColor: fill }]} />
        <View style={[styles.personHeadSmall, { backgroundColor: fill }]} />
        <View style={[styles.personBodySmall, { backgroundColor: fill }]} />
      </View>
    );
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.moreIcon}
    >
      <View style={[styles.moreDot, { backgroundColor: fill }]} />
      <View style={[styles.moreDot, { backgroundColor: fill }]} />
      <View style={[styles.moreDot, { backgroundColor: fill }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#063b22',
    borderRadius: 34,
    elevation: 10,
    flexDirection: 'row',
    marginBottom: 12,
    marginHorizontal: 16,
    minHeight: 68,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#062e1b',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  currentItem: { backgroundColor: 'rgba(38, 220, 111, 0.12)' },
  currentText: { color: '#25df72' },
  disabled: { opacity: 0.5 },
  iconBox: { alignItems: 'center', height: 25, justifyContent: 'center', width: 27 },
  homeRoof: { height: 16, position: 'absolute', transform: [{ rotate: '45deg' }], width: 16 },
  homeBody: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    bottom: 2,
    height: 13,
    position: 'absolute',
    width: 18,
  },
  homeDoor: { backgroundColor: '#fff', bottom: 2, height: 7, position: 'absolute', width: 4 },
  documentIcon: { borderRadius: 4, borderWidth: 2, padding: 4 },
  documentLine: { height: 2, marginBottom: 3, width: 13 },
  documentLineShort: { height: 2, width: 8 },
  communityIcon: { height: 26, position: 'relative', width: 28 },
  personHead: { borderRadius: 8, height: 9, left: 3, position: 'absolute', top: 1, width: 9 },
  personBody: {
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    bottom: 1,
    height: 12,
    left: 1,
    position: 'absolute',
    width: 14,
  },
  personHeadSmall: { borderRadius: 6, height: 7, position: 'absolute', right: 2, top: 4, width: 7 },
  personBodySmall: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    bottom: 1,
    height: 9,
    position: 'absolute',
    right: 0,
    width: 11,
  },
  moreIcon: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    height: 25,
    justifyContent: 'center',
    width: 27,
  },
  moreDot: { borderRadius: 4, height: 5, width: 5 },
  item: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    padding: 4,
  },
  label: { color: '#9eb4a7', fontSize: 10, fontWeight: '700', marginTop: 2 },
  pressed: { opacity: 0.65 },
  reportButton: {
    alignItems: 'center',
    backgroundColor: '#17683b',
    borderColor: '#063b22',
    borderRadius: 30,
    borderWidth: 4,
    elevation: 5,
    height: 58,
    justifyContent: 'center',
    marginHorizontal: 2,
    marginTop: -20,
    shadowColor: '#0c3920',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    width: 58,
  },
  reportGlyph: { height: 27, position: 'relative', width: 27 },
  reportCrossHorizontal: {
    backgroundColor: '#fff',
    borderRadius: 2,
    height: 4,
    left: 1,
    position: 'absolute',
    top: 11,
    width: 25,
  },
  reportCrossVertical: {
    backgroundColor: '#fff',
    borderRadius: 2,
    height: 25,
    left: 11,
    position: 'absolute',
    top: 1,
    width: 4,
  },
  reportLabel: { color: '#ffffff', fontSize: 9, fontWeight: '800' },
});
