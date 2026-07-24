import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CivicIcon } from '../../src/ui/civic-icon';
import { useLocalization } from '../../src/ui/localization';
import { Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

export default function ComplaintResultScreen() {
  const router = useRouter();
  const { t } = useLocalization();
  const params = useLocalSearchParams<{
    status?: string;
    complaintId?: string;
    number?: string;
    message?: string;
  }>();
  const success = params.status === 'success';
  const unknown = params.status === 'unknown';
  const title = success
    ? t('reportSubmitted')
    : unknown
      ? t('submissionStatusUnknown')
      : t('reportNotSubmitted');
  const message = success
    ? t('complaintReceived', { number: params.number ?? '' })
    : unknown
      ? t('submissionUnconfirmed')
      : (params.message ?? t('draftSafeRetry'));

  return (
    <Screen>
      <View style={styles.container}>
        <View
          style={[
            styles.icon,
            success ? styles.success : unknown ? styles.unknown : styles.failure,
          ]}
        >
          <CivicIcon
            color={
              success
                ? mobileTheme.colors.success
                : unknown
                  ? mobileTheme.colors.info
                  : mobileTheme.colors.accent
            }
            name={success ? 'shield' : unknown ? 'status' : 'complaint'}
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
        {success && params.complaintId ? (
          <Action
            label={t('viewComplaint')}
            onPress={() => router.replace(`/complaints/${params.complaintId}`)}
          />
        ) : null}
        {unknown ? (
          <>
            <Action label={t('openComplaints')} onPress={() => router.replace('/complaints')} />
            <Action
              label={t('returnToReport')}
              onPress={() => router.replace('/complaints/new')}
              secondary
            />
          </>
        ) : success ? (
          <Action
            label={t('openComplaints')}
            onPress={() => router.replace('/complaints')}
            secondary={Boolean(params.complaintId)}
          />
        ) : (
          <>
            <Action label={t('returnToReport')} onPress={() => router.replace('/complaints/new')} />
            <Action
              label={t('openComplaints')}
              onPress={() => router.replace('/complaints')}
              secondary
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const Action = ({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={[styles.action, secondary && styles.secondaryAction]}
  >
    <Text style={[styles.actionText, secondary && styles.secondaryActionText]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  action: {
    backgroundColor: mobileTheme.colors.primary,
    borderRadius: mobileTheme.radius.medium,
    minHeight: 48,
    paddingHorizontal: 22,
    paddingVertical: 14,
    width: '100%',
  },
  actionText: {
    color: mobileTheme.colors.white,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  container: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', padding: 22 },
  failure: { backgroundColor: mobileTheme.colors.accentSoft },
  icon: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.full,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  message: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
    textAlign: 'center',
  },
  secondaryAction: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.primary,
    borderWidth: 1,
  },
  secondaryActionText: { color: mobileTheme.colors.primary },
  success: { backgroundColor: mobileTheme.colors.primarySoft },
  title: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.title,
    fontWeight: '900',
    textAlign: 'center',
  },
  unknown: { backgroundColor: mobileTheme.colors.infoSoft },
});
