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
import { subscribeToComplaintEvents } from '../../src/realtime/complaint-subscription';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

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
  const parameters = useLocalSearchParams<{ complaintId?: string | string[] }>();
  const complaintId = firstParameter(parameters.complaintId);
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const [messageBody, setMessageBody] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [readReceiptWarning, setReadReceiptWarning] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
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
        setReadReceiptWarning('Messages loaded, but their read status could not be updated.');
      }
    } catch (error) {
      if (!isMountedRef.current || loadSequence !== activeLoadRef.current) return;
      setState({ message: getUserFacingComplaintError(error), status: 'error' });
    }
  }, [accessToken, complaintId]);

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

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error')
    return <ErrorScreen message={auth.state.message} />;
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (accessToken === null) return <Redirect href="/auth" />;
  if (complaintId === undefined) return <ErrorScreen message="The complaint link is incomplete." />;
  if (state.status === 'loading') return <LoadingScreen label="Loading complaint…" />;
  if (state.status === 'error')
    return <ErrorScreen message={state.message} title="Complaint unavailable" />;

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
          <Text style={styles.status}>{state.complaint.status.replaceAll('_', ' ')}</Text>
          <Text style={styles.help}>
            Private complaint · submitted {new Date(state.complaint.submittedAt).toLocaleString()}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>Description</Text>
          <Text style={styles.body}>
            {state.complaint.description ?? 'No description was stored.'}
          </Text>
          <Text style={styles.heading}>Routing</Text>
          <Text style={styles.body}>
            {state.complaint.routing.status.replaceAll('_', ' ')} ·{' '}
            {state.complaint.routing.explanation.reason.replaceAll('_', ' ')}
          </Text>
          <Text style={styles.heading}>Evidence</Text>
          <Text style={styles.body}>{state.complaint.media.length} private media item(s)</Text>
        </View>
        <Text accessibilityRole="header" style={styles.timelineTitle}>
          Timeline
        </Text>
        {state.timeline.entries.map((entry) => (
          <View key={entry.id} style={styles.timelineEntry}>
            <Text style={styles.heading}>{entry.title}</Text>
            <Text style={styles.help}>{new Date(entry.occurredAt).toLocaleString()}</Text>
            {entry.description === null ? null : (
              <Text style={styles.body}>{entry.description}</Text>
            )}
          </View>
        ))}
        <Text accessibilityRole="header" style={styles.timelineTitle}>
          Private conversation
        </Text>
        <Text style={styles.help}>
          Messages are visible only to you and currently authorized complaint staff.
        </Text>
        {state.communicationError === null ? null : (
          <View style={styles.communicationWarning}>
            <Text accessibilityRole="alert" style={styles.communicationWarningText}>
              Conversation history is temporarily unavailable. {state.communicationError}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void load()}>
              <Text style={styles.retryConversationText}>Retry conversation</Text>
            </Pressable>
          </View>
        )}
        {state.messages.length === 0 ? (
          <Text style={styles.help}>No messages yet.</Text>
        ) : (
          state.messages.map((entry) => (
            <View
              key={entry.id}
              style={[styles.messageCard, entry.authoredByMe ? styles.myMessage : null]}
            >
              <Text style={styles.messageAuthor}>
                {entry.authoredByMe
                  ? 'You'
                  : entry.authorType === 'government'
                    ? 'Government staff'
                    : 'Citizen'}
              </Text>
              <Text style={styles.body}>{entry.body}</Text>
              <Text style={styles.help}>{new Date(entry.createdAt).toLocaleString()}</Text>
            </View>
          ))
        )}
        <TextInput
          accessibilityLabel="Private complaint message"
          editable={!isSending && state.communicationError === null}
          maxLength={4_000}
          multiline
          onChangeText={setMessageBody}
          placeholder="Write a private message"
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
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.sendButtonText}>Send private message</Text>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { color: '#334155', lineHeight: 22 },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 9,
    padding: 16,
  },
  content: { gap: 14, padding: 20, paddingBottom: 46 },
  communicationWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  communicationWarningText: { color: '#92400e', lineHeight: 20 },
  heading: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  help: { color: '#64748b', lineHeight: 20 },
  number: { color: '#14532d', fontSize: 27, fontWeight: '900' },
  messageAuthor: { color: '#14532d', fontWeight: '800' },
  messageCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  messageError: { color: '#991b1b', lineHeight: 20 },
  messageInput: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
    borderRadius: 10,
    borderWidth: 1,
    color: '#0f172a',
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
  },
  myMessage: { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  readReceiptWarning: { color: '#92400e', lineHeight: 20 },
  retryConversationText: { color: '#166534', fontWeight: '800', paddingVertical: 6 },
  receiptCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 17,
  },
  status: { color: '#166534', fontSize: 17, fontWeight: '800', textTransform: 'capitalize' },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 50,
    padding: 12,
  },
  sendButtonText: { color: '#ffffff', fontWeight: '800' },
  timelineEntry: {
    borderLeftColor: '#86efac',
    borderLeftWidth: 3,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timelineTitle: { color: '#14281d', fontSize: 22, fontWeight: '900', marginTop: 6 },
});
