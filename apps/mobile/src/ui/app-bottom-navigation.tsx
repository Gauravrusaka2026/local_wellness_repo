import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useComplaintCapture } from '../complaints/complaint-context';

export type PrimaryNavigationItem = 'complaints' | 'home' | 'menu' | 'nearby';

const navigationItems = [
  { glyph: '⌂', key: 'home', label: 'Home', route: '/home' },
  { glyph: '☷', key: 'complaints', label: 'Complaints', route: '/complaints' },
  { glyph: '◎', key: 'nearby', label: 'Nearby', route: '/governance' },
  { glyph: '≡', key: 'menu', label: 'Menu', route: '/menu' },
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
          glyph={item.glyph}
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
          <Text accessibilityElementsHidden style={styles.reportGlyph}>
            ＋
          </Text>
        )}
        <Text style={styles.reportLabel}>Report</Text>
      </Pressable>
      {navigationItems.slice(2).map((item) => (
        <NavigationButton
          current={current === item.key}
          glyph={item.glyph}
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
  glyph,
  label,
  onPress,
}: Readonly<{ current: boolean; glyph: string; label: string; onPress: () => void }>) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="tab"
    accessibilityState={{ selected: current }}
    onPress={onPress}
    style={({ pressed }) => [styles.item, pressed && styles.pressed]}
  >
    <Text accessibilityElementsHidden style={[styles.glyph, current && styles.currentText]}>
      {glyph}
    </Text>
    <Text style={[styles.label, current && styles.currentText]}>{label}</Text>
    <View style={[styles.indicator, current && styles.currentIndicator]} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderTopColor: '#dce6df',
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 74,
    paddingHorizontal: 6,
    paddingTop: 7,
  },
  currentIndicator: { backgroundColor: '#237345' },
  currentText: { color: '#1d6840' },
  disabled: { opacity: 0.5 },
  glyph: { color: '#76867b', fontSize: 22, lineHeight: 24 },
  indicator: { borderRadius: 999, height: 3, marginTop: 5, width: 18 },
  item: { alignItems: 'center', flex: 1, justifyContent: 'flex-end', minHeight: 58, padding: 4 },
  label: { color: '#697b6f', fontSize: 10, fontWeight: '700', marginTop: 2 },
  pressed: { opacity: 0.65 },
  reportButton: {
    alignItems: 'center',
    backgroundColor: '#17683b',
    borderColor: '#ffffff',
    borderRadius: 30,
    borderWidth: 4,
    elevation: 5,
    height: 62,
    justifyContent: 'center',
    marginHorizontal: 2,
    marginTop: -20,
    shadowColor: '#0c3920',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    width: 62,
  },
  reportGlyph: { color: '#ffffff', fontSize: 28, fontWeight: '400', lineHeight: 28 },
  reportLabel: { color: '#ffffff', fontSize: 9, fontWeight: '800' },
});
