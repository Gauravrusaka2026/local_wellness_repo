import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export const Screen = ({ children }: Readonly<{ children: ReactNode }>) => (
  <SafeAreaView style={styles.screen}>{children}</SafeAreaView>
);

export const LoadingScreen = ({ label }: Readonly<{ label: string }>) => (
  <Screen>
    <View accessibilityLiveRegion="polite" style={styles.centered}>
      <ActivityIndicator accessibilityLabel={label} color="#166534" size="large" />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  </Screen>
);

export const ErrorScreen = ({
  action,
  message,
  title = 'Unable to continue',
}: Readonly<{
  action?: Readonly<{ label: string; onPress: () => void }>;
  message: string;
  title?: string;
}>) => (
  <Screen>
    <View accessibilityLiveRegion="assertive" style={styles.centered}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text accessibilityRole="alert" style={styles.errorText}>
        {message}
      </Text>
      {action === undefined ? null : (
        <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  </Screen>
);

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: '#166534',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
    color: '#991b1b',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  screen: {
    backgroundColor: '#f7faf7',
    flex: 1,
  },
  statusText: {
    color: '#334155',
    fontSize: 16,
  },
  title: {
    color: '#14281d',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
});
