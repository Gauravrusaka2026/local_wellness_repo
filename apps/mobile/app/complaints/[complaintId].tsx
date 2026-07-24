import { Redirect, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ComplaintDetail, ComplaintMessage, ComplaintTimeline } from '@local-wellness/types';

import { useAuth } from '../../src/auth/auth-context';
import {
  getComplaint,
  createComplaintMessage,
  getComplaintTimeline,
  getUserFacingComplaintError,
  listComplaintMessages,
  markComplaintMessagesRead,
} from '../../src/complaints/complaint-service';
import { ResolutionAccountability } from '../../src/complaints/resolution-accountability';
import { subscribeToComplaintEvents } from '../../src/realtime/complaint-subscription';
import { useLocalization } from '../../src/ui/localization';
import {
  complaintStatusMessageKeys,
  routingDecisionStatusMessageKeys,
} from '../../src/ui/localized-mobile-copy';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

type DetailState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{
      status: 'ready';
      complaint: ComplaintDetail;
      communicationError: string | null;
      messages: ComplaintMessage[];
      timeline: ComplaintTimeline;
    }>;

const firstParameter = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default function ComplaintDetailScreen() {
  const auth = useAuth();
  const { formatDateTime, t } = useLocalization();
  const parameters = useLocalSearchParams<{ complaintId?: string | string[] }>();
  const complaintId = firstParameter(parameters.complaintId);
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const [messageBody, setMessageBody] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [readReceiptWarning, setReadReceiptWarning] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [accountabilityRefreshSignal, setAccountabilityRefreshSignal] = useState(0);
  const activeLoadRef = useRef(0);
  const isMountedRef = useRef(true);
  const isSendingRef = useRef(false);
  const lastReadMessageIdRef = useRef<string | null>(null);
  const accessToken = auth.state.status === 'signed-in' ? auth.state.session.access_token : null;

  const load = useCallback(async (): Promise<void> => {
    if (accessToken === null || complaintId === undefined) return;
    const loadSequence = ++activeLoadRef.current;
    try {
      const [complaint, timeline, messageOutcome] = await Promise.all([
        getComplaint(accessToken, complaintId),
        getComplaintTimeline(accessToken, complaintId),
        listComplaintMessages(accessToken, complaintId).then(
          (page) => ({ page }) as const,
          (error: unknown) => ({ error }) as const,
        ),
      ]);
      if (!isMountedRef.current || loadSequence !== activeLoadRef.current) return;
      const communicationError =
        'error' in messageOutcome ? getUserFacingComplaintError(messageOutcome.error) : null;
      setState((current) => ({
        communicationError,
        complaint,
        messages:
          'page' in messageOutcome
            ? messageOutcome.page.items
            : current.status === 'ready' && current.complaint.id === complaint.id
              ? current.messages
              : [],
        status: 'ready',
        timeline,
      }));
      setAccountabilityRefreshSignal((current) => current + 1);
      setReadReceiptWarning(null);

      const newestMessage = 'page' in messageOutcome ? messageOutcome.page.items[0] : undefined;
      if (newestMessage === undefined || lastReadMessageIdRef.current === newestMessage.id) return;

      lastReadMessageIdRef.current = newestMessage.id;
      try {
        await markComplaintMessagesRead(accessToken, complaintId, {
          readThroughCreatedAt: newestMessage.createdAt,
          readThroughMessageId: newestMessage.id,
        });
      } catch {
        if (lastReadMessageIdRef.current === newestMessage.id) {
          lastReadMessageIdRef.current = null;
        }
        if (!isMountedRef.current || loadSequence !== activeLoadRef.current) return;
        setReadReceiptWarning(t('messagesReadWarning'));
      }
    } catch (error) {
      if (!isMountedRef.current || loadSequence !== activeLoadRef.current) return;
      setState({ message: getUserFacingComplaintError(error), status: 'error' });
    }
  }, [accessToken, complaintId, t]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      activeLoadRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (accessToken === null || complaintId === undefined) return;
    const initialLoadTimer = setTimeout(() => {
      setState({ status: 'loading' });
      setMessageError(null);
      setReadReceiptWarning(null);
      lastReadMessageIdRef.current = null;
      void load();
    }, 0);
    const subscription = subscribeToComplaintEvents(accessToken, complaintId, () => {
      void load();
    });
    return () => {
      clearTimeout(initialLoadTimer);
      activeLoadRef.current += 1;
      subscription?.close();
    };
  }, [accessToken, complaintId, load]);

  if (auth.state.status === 'loading') return <LoadingScreen label={t('restoringSession')} />;
  if (auth.state.status === 'configuration-error')
    return <ErrorScreen message={auth.state.message} />;
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'phone-verification-required') {
    return <Redirect href="/auth/phone-verification" />;
  }
  if (accessToken === null) return <Redirect href="/auth" />;
  if (complaintId === undefined) return <ErrorScreen message={t('complaintLinkIncomplete')} />;
  if (state.status === 'loading') return <LoadingScreen label={t('loadingComplaint')} />;
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

  const sendMessage = async (): Promise<void> => {
    const body = messageBody.trim();
    if (body.length === 0 || isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);
    setMessageError(null);
    try {
      await createComplaintMessage(accessToken, complaintId, {
        body,
        clientMessageId: Crypto.randomUUID(),
      });
      if (!isMountedRef.current) return;
      setMessageBody('');
      await load();
    } catch (error) {
      if (isMountedRef.current) setMessageError(getUserFacingComplaintError(error));
    } finally {
      isSendingRef.current = false;
      if (isMountedRef.current) setIsSending(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.receiptCard}>
          <Text accessibilityRole="header" style={styles.number}>
            {state.complaint.complaintNumber}
          </Text>
          <Text style={styles.status}>{t(complaintStatusMessageKeys[state.complaint.status])}</Text>
          <Text style={styles.help}>
            {t('privateComplaintSubmitted', {
              date: formatDateTime(state.complaint.submittedAt),
            })}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>{t('description')}</Text>
          <Text style={styles.body}>{state.complaint.description ?? t('noDescription')}</Text>
          <Text style={styles.heading}>{t('routing')}</Text>
          <Text style={styles.body}>
            {t(routingDecisionStatusMessageKeys[state.complaint.routing.status])} ·{' '}
            {state.complaint.routing.explanation.reason.replaceAll('_', ' ')}
          </Text>
          <Text style={styles.heading}>{t('evidence')}</Text>
          <Text style={styles.body}>
            {t('privateMediaItems', { count: state.complaint.media.length })}
          </Text>
        </View>
        <ResolutionAccountability
          accessToken={accessToken}
          complaintId={complaintId}
          onChanged={load}
          refreshSignal={accountabilityRefreshSignal}
        />
        <Text accessibilityRole="header" style={styles.timelineTitle}>
          {t('statusHistory')}
        </Text>
        {state.timeline.entries.map((entry) => (
          <View key={entry.id} style={styles.timelineEntry}>
            <Text style={styles.heading}>{entry.title}</Text>
            <Text style={styles.help}>{formatDateTime(entry.occurredAt)}</Text>
            {entry.description === null ? null : (
              <Text style={styles.body}>{entry.description}</Text>
            )}
          </View>
        ))}
        <Text accessibilityRole="header" style={styles.timelineTitle}>
          {t('privateConversation')}
        </Text>
        <Text style={styles.help}>{t('privateConversationHint')}</Text>
        {state.communicationError === null ? null : (
          <View style={styles.communicationWarning}>
            <Text accessibilityRole="alert" style={styles.communicationWarningText}>
              {t('conversationUnavailable')} {state.communicationError}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void load()}>
              <Text style={styles.retryConversationText}>{t('retryConversation')}</Text>
            </Pressable>
          </View>
        )}
        {state.messages.length === 0 ? (
          <Text style={styles.help}>{t('noMessages')}</Text>
        ) : (
          state.messages.map((entry) => (
            <View
              key={entry.id}
              style={[styles.messageCard, entry.authoredByMe ? styles.myMessage : null]}
            >
              <Text style={styles.messageAuthor}>
                {entry.authoredByMe
                  ? t('you')
                  : entry.authorType === 'government'
                    ? t('governmentStaff')
                    : t('citizen')}
              </Text>
              <Text style={styles.body}>{entry.body}</Text>
              <Text style={styles.help}>{formatDateTime(entry.createdAt)}</Text>
            </View>
          ))
        )}
        <TextInput
          accessibilityLabel={t('privateMessage')}
          editable={!isSending && state.communicationError === null}
          maxLength={4_000}
          multiline
          onChangeText={setMessageBody}
          placeholder={t('writePrivateMessage')}
          style={styles.messageInput}
          value={messageBody}
        />
        {messageError === null ? null : (
          <Text accessibilityRole="alert" style={styles.messageError}>
            {messageError}
          </Text>
        )}
        {readReceiptWarning === null ? null : (
          <Text accessibilityRole="alert" style={styles.readReceiptWarning}>
            {readReceiptWarning}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={
            isSending || state.communicationError !== null || messageBody.trim().length === 0
          }
          onPress={() => void sendMessage()}
          style={styles.sendButton}
        >
          {isSending ? (
            <ActivityIndicator color={mobileTheme.colors.white} />
          ) : (
            <Text style={styles.sendButtonText}>{t('sendPrivateMessage')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.medium,
    borderWidth: 1,
    gap: 9,
    padding: 16,
  },
  content: { gap: 12, padding: 16, paddingBottom: 36 },
  communicationWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  communicationWarningText: { color: '#92400e', lineHeight: 20 },
  heading: { color: mobileTheme.colors.text, fontSize: 14, fontWeight: '800' },
  help: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.helper,
    lineHeight: 18,
  },
  number: { color: mobileTheme.colors.primaryDark, fontSize: 22, fontWeight: '900' },
  messageAuthor: { color: mobileTheme.colors.primaryDark, fontSize: 14, fontWeight: '800' },
  messageCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.medium,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  messageError: {
    color: mobileTheme.colors.danger,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  messageInput: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: '#94a3b8',
    borderRadius: 10,
    borderWidth: 1,
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.body,
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
  },
  myMessage: { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  readReceiptWarning: { color: '#92400e', lineHeight: 20 },
  retryConversationText: {
    color: mobileTheme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 6,
  },
  receiptCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 17,
  },
  status: {
    color: mobileTheme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.primary,
    borderRadius: mobileTheme.radius.small,
    justifyContent: 'center',
    minHeight: 50,
    padding: 12,
  },
  sendButtonText: { color: mobileTheme.colors.white, fontSize: 14, fontWeight: '800' },
  timelineEntry: {
    borderLeftColor: '#86efac',
    borderLeftWidth: 3,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timelineTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.heading,
    fontWeight: '900',
    marginTop: 6,
  },
});
