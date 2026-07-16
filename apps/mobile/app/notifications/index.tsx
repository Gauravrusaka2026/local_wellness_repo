import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { InAppNotification } from '@local-wellness/types';

import { useAuth } from '../../src/auth/auth-context';
import {
  getUserFacingComplaintError,
  listNotifications,
  markNotificationRead,
} from '../../src/complaints/complaint-service';
import { subscribeToNotificationEvents } from '../../src/realtime/complaint-subscription';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

type NotificationState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'ready'; items: InAppNotification[] }>;

const eventLabel = (eventType: InAppNotification['eventType']): string =>
  ({
    acknowledgement: 'Complaint acknowledged',
    assignment: 'Complaint assigned',
    escalation: 'Complaint escalated',
    message: 'New private message',
    reopen: 'Complaint reopened',
    resolution: 'Resolution update',
    status_update: 'Complaint status updated',
    submission: 'Complaint submitted',
    transfer: 'Complaint transferred',
  })[eventType];

export default function NotificationsScreen() {
  const auth = useAuth();
  const router = useRouter();
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

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error')
    return <ErrorScreen message={auth.state.message} />;
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (accessToken === null) return <Redirect href="/auth" />;
  if (state.status === 'loading') return <LoadingScreen label="Loading notifications…" />;
  if (state.status === 'error')
    return <ErrorScreen message={state.message} title="Notifications unavailable" />;

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
            Notifications
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void load()}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>
        <Text style={styles.help}>
          This history remains available after you reconnect. Realtime delivery is an enhancement.
        </Text>
        {operationError === null ? null : (
          <Text accessibilityRole="alert" style={styles.error}>
            {operationError}
          </Text>
        )}
        {state.items.length === 0 ? (
          <Text style={styles.empty}>No notifications yet.</Text>
        ) : (
          state.items.map((notification) => (
            <Pressable
              accessibilityRole="button"
              key={notification.id}
              onPress={() => void openNotification(notification)}
              style={[styles.card, notification.readAt === null ? styles.unread : null]}
            >
              <Text style={styles.cardTitle}>{eventLabel(notification.eventType)}</Text>
              <Text style={styles.help}>
                {notification.payload.complaintNumber ?? 'Your complaint'} ·{' '}
                {new Date(notification.occurredAt).toLocaleString()}
              </Text>
              {busyId === notification.id ? <ActivityIndicator color="#166534" /> : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    padding: 15,
  },
  cardTitle: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  content: { gap: 14, padding: 20, paddingBottom: 48 },
  empty: { color: '#64748b', paddingVertical: 24, textAlign: 'center' },
  error: { color: '#991b1b', lineHeight: 20 },
  headingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  help: { color: '#64748b', lineHeight: 20 },
  refresh: { color: '#166534', fontWeight: '800', padding: 10 },
  title: { color: '#14281d', fontSize: 28, fontWeight: '900' },
  unread: { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
});
