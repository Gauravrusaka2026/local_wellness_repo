import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { InAppNotification } from '@local-wellness/types';
import type { MessageKey } from '@local-wellness/localization';

import { useAuth } from '../../src/auth/auth-context';
import {
  getUserFacingComplaintError,
  listNotifications,
  markNotificationRead,
} from '../../src/complaints/complaint-service';
import { subscribeToNotificationEvents } from '../../src/realtime/complaint-subscription';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

type NotificationState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'ready'; items: InAppNotification[] }>;

const eventMessageKeys = {
  acknowledgement: 'notificationAcknowledgement',
  assignment: 'notificationAssignment',
  escalation: 'notificationEscalation',
  message: 'notificationMessage',
  reopen: 'notificationReopen',
  resolution: 'notificationResolution',
  status_update: 'notificationStatusUpdate',
  submission: 'notificationSubmission',
  transfer: 'notificationTransfer',
} as const satisfies Readonly<Record<InAppNotification['eventType'], MessageKey>>;

const eventMessageKey = (eventType: InAppNotification['eventType']): MessageKey =>
  eventMessageKeys[eventType];

export default function NotificationsScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { formatDateTime, t } = useLocalization();
  const [state, setState] = useState<NotificationState>({ status: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const activeLoadRef = useRef(0);
  const busyIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const accessToken = auth.state.status === 'signed-in' ? auth.state.session.access_token : null;

  const load = useCallback(async (): Promise<void> => {
    if (accessToken === null) return;
    const loadSequence = ++activeLoadRef.current;
    try {
      const page = await listNotifications(accessToken);
      if (!isMountedRef.current || loadSequence !== activeLoadRef.current) return;
      setState({ items: page.items, status: 'ready' });
    } catch (error) {
      if (!isMountedRef.current || loadSequence !== activeLoadRef.current) return;
      setState({ message: getUserFacingComplaintError(error), status: 'error' });
    }
  }, [accessToken]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      activeLoadRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (accessToken === null) return;
    const initialLoadTimer = setTimeout(() => {
      void load();
    }, 0);
    const subscription = subscribeToNotificationEvents(accessToken, () => {
      void load();
    });
    return () => {
      clearTimeout(initialLoadTimer);
      activeLoadRef.current += 1;
      subscription?.close();
    };
  }, [accessToken, load]);

  if (auth.state.status === 'loading') return <LoadingScreen label={t('restoringSession')} />;
  if (auth.state.status === 'configuration-error')
    return <ErrorScreen message={auth.state.message} />;
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'phone-verification-required') {
    return <Redirect href="/auth/phone-verification" />;
  }
  if (accessToken === null) return <Redirect href="/auth" />;
  if (state.status === 'loading') return <LoadingScreen label={t('loading')} />;
  if (state.status === 'error')
    return (
      <ErrorScreen
        action={{
          label: t('tryAgain'),
          onPress: () => {
            setState({ status: 'loading' });
            void load();
          },
        }}
        message={state.message}
        title={t('unableToContinue')}
      />
    );

  const openNotification = async (notification: InAppNotification): Promise<void> => {
    if (busyIdRef.current !== null) return;
    busyIdRef.current = notification.id;
    setBusyId(notification.id);
    setOperationError(null);
    try {
      let readAt = notification.readAt;
      if (notification.readAt === null) {
        readAt = (await markNotificationRead(accessToken, notification.id)).readAt;
      }
      if (!isMountedRef.current) return;
      if (readAt !== notification.readAt) {
        setState((current) =>
          current.status === 'ready'
            ? {
                items: current.items.map((item) =>
                  item.id === notification.id ? { ...item, readAt } : item,
                ),
                status: 'ready',
              }
            : current,
        );
      }
      router.push(`/complaints/${notification.payload.complaintId}`);
    } catch (error) {
      if (isMountedRef.current) setOperationError(getUserFacingComplaintError(error));
    } finally {
      busyIdRef.current = null;
      if (isMountedRef.current) setBusyId(null);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('notifications')}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void load()}>
            <Text style={styles.refresh}>{t('refresh')}</Text>
          </Pressable>
        </View>
        <Text style={styles.help}>{t('notificationsReconnect')}</Text>
        {operationError === null ? null : (
          <Text accessibilityRole="alert" style={styles.error}>
            {operationError}
          </Text>
        )}
        {state.items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('noNotifications')}</Text>
            <Text style={styles.empty}>{t('noNotificationsBody')}</Text>
          </View>
        ) : (
          state.items.map((notification) => (
            <Pressable
              accessibilityHint={t('openRelatedComplaint')}
              accessibilityLabel={`${t(eventMessageKey(notification.eventType))}. ${notification.payload.complaintNumber ?? t('complaint')}. ${formatDateTime(notification.occurredAt)}. ${notification.readAt === null ? t('unread') : t('read')}.`}
              accessibilityRole="button"
              accessibilityState={{
                busy: busyId === notification.id,
                disabled: busyId !== null,
              }}
              disabled={busyId !== null}
              key={notification.id}
              onPress={() => void openNotification(notification)}
              style={[styles.card, notification.readAt === null ? styles.unread : null]}
            >
              <Text style={styles.cardTitle}>{t(eventMessageKey(notification.eventType))}</Text>
              <Text style={styles.help}>
                {notification.payload.complaintNumber ?? t('complaint')} ·{' '}
                {formatDateTime(notification.occurredAt)}
              </Text>
              {busyId === notification.id ? (
                <ActivityIndicator accessibilityElementsHidden color={mobileTheme.colors.primary} />
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.medium,
    borderWidth: 1,
    gap: 5,
    padding: 15,
  },
  cardTitle: { color: mobileTheme.colors.text, fontSize: 14, fontWeight: '800' },
  content: { gap: 12, padding: 16, paddingBottom: 36 },
  empty: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    gap: 6,
    padding: 24,
  },
  emptyTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.heading,
    fontWeight: '900',
  },
  error: {
    color: mobileTheme.colors.danger,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  headingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  help: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.helper,
    lineHeight: 18,
  },
  refresh: { color: mobileTheme.colors.primary, fontSize: 14, fontWeight: '800', padding: 10 },
  title: { color: mobileTheme.colors.text, fontSize: mobileTheme.type.title, fontWeight: '900' },
  unread: { backgroundColor: mobileTheme.colors.primarySoft, borderColor: '#86efac' },
});
