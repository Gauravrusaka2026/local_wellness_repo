'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ComplaintMessage } from '@local-wellness/types';
import { io } from 'socket.io-client';

import { createComplaintMessage, markComplaintMessagesRead } from '../../../lib/api/communications';
import { AuthenticationRequiredError, getUserFacingApiError } from '../../../lib/api/client';
import { getPublicRealtimeUrl } from '../../../lib/environment';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';
import { formatDateTime } from '../../../lib/complaints/presentation';

type ComplaintRealtimeEventName =
  'complaint:status_changed' | 'message:created' | 'notification:created';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const realtimeEventMatchesComplaint = (
  eventName: ComplaintRealtimeEventName,
  event: unknown,
  complaintId: string,
): boolean => {
  if (!isRecord(event) || !isRecord(event['payload'])) return false;

  const payload = event['payload'];
  if (eventName === 'message:created') return payload['complaintId'] === complaintId;
  return isRecord(payload['payload']) && payload['payload']['complaintId'] === complaintId;
};

export const ConversationPanel = ({
  complaintId,
  loadError,
  messages,
}: Readonly<{ complaintId: string; loadError: string | null; messages: ComplaintMessage[] }>) => {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [readReceiptWarning, setReadReceiptWarning] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const isPendingRef = useRef(false);
  const lastReadMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const realtimeUrl = getPublicRealtimeUrl();
    if (realtimeUrl === null) return;
    const supabase = createBrowserSupabaseClient();
    let socket: ReturnType<typeof io> | null = null;
    let cancelled = false;
    let currentAccessToken: string | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = (): void => {
      if (cancelled || refreshTimer !== null) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (!cancelled) router.refresh();
      }, 150);
    };

    const connectWithToken = (accessToken: string): void => {
      const tokenChanged = currentAccessToken !== null && currentAccessToken !== accessToken;
      currentAccessToken = accessToken;
      if (socket === null) {
        socket = io(realtimeUrl, {
          auth: { accessToken },
          autoConnect: false,
          transports: ['websocket', 'polling'],
        });
        socket.on('connect', () => {
          socket?.emit('room:join', { roomId: complaintId, roomType: 'complaint' });
        });
        for (const eventName of [
          'complaint:status_changed',
          'message:created',
          'notification:created',
        ] as const) {
          socket.on(eventName, (event: unknown) => {
            if (realtimeEventMatchesComplaint(eventName, event, complaintId)) scheduleRefresh();
          });
        }
      } else {
        socket.auth = { accessToken };
      }

      if (socket.connected && tokenChanged) socket.disconnect();
      if (!socket.connected) socket.connect();
    };

    const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session?.access_token) {
        currentAccessToken = null;
        socket?.disconnect();
        return;
      }
      connectWithToken(session.access_token);
    });

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled || !data.session?.access_token) return;
        connectWithToken(data.session.access_token);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      authSubscription.data.subscription.unsubscribe();
      if (refreshTimer !== null) clearTimeout(refreshTimer);
      if (socket?.connected) {
        socket.emit('room:leave', { roomId: complaintId, roomType: 'complaint' });
      }
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [complaintId, router]);

  const latestMessage = messages[0];
  useEffect(() => {
    if (latestMessage === undefined || lastReadMessageIdRef.current === latestMessage.id) {
      return;
    }

    let cancelled = false;
    lastReadMessageIdRef.current = latestMessage.id;
    setReadReceiptWarning(null);
    const markRead = async (): Promise<void> => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session?.access_token) throw new AuthenticationRequiredError();
        await markComplaintMessagesRead(data.session.access_token, complaintId, {
          readThroughCreatedAt: latestMessage.createdAt,
          readThroughMessageId: latestMessage.id,
        });
      } catch {
        if (lastReadMessageIdRef.current === latestMessage.id) {
          lastReadMessageIdRef.current = null;
        }
        if (!cancelled && isMountedRef.current) {
          setReadReceiptWarning('Messages loaded, but their read status could not be updated.');
        }
      }
    };
    void markRead();

    return () => {
      cancelled = true;
    };
  }, [complaintId, latestMessage]);

  const submit = async (): Promise<void> => {
    const normalizedBody = body.trim();
    if (loadError !== null || normalizedBody.length === 0 || isPendingRef.current) return;
    isPendingRef.current = true;
    setError(null);
    setIsPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) {
        throw new AuthenticationRequiredError();
      }
      await createComplaintMessage(data.session.access_token, complaintId, {
        body: normalizedBody,
        clientMessageId: crypto.randomUUID(),
      });
      if (!isMountedRef.current) return;
      setBody('');
      router.refresh();
    } catch (caught) {
      if (isMountedRef.current) setError(getUserFacingApiError(caught));
    } finally {
      isPendingRef.current = false;
      if (isMountedRef.current) setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="conversation-heading" className="content-card">
      <p className="eyebrow">Citizen-visible communication</p>
      <h2 id="conversation-heading">Private conversation</h2>
      <p className="field-hint">
        Messages are persisted before delivery and visible only to the citizen and currently
        authorized complaint staff. Internal notes remain separate.
      </p>
      {loadError === null ? null : (
        <div className="warning-notice" role="alert">
          <p>Conversation history is temporarily unavailable. {loadError}</p>
          <button className="secondary-button" onClick={() => router.refresh()} type="button">
            Retry conversation
          </button>
        </div>
      )}
      {messages.length === 0 ? (
        <p className="muted">No private messages recorded.</p>
      ) : (
        <ol className="conversation-list">
          {messages.map((message) => (
            <li className={message.authoredByMe ? 'message-own' : undefined} key={message.id}>
              <strong>
                {message.authoredByMe
                  ? 'You'
                  : message.authorType === 'citizen'
                    ? 'Citizen'
                    : 'Government staff'}
              </strong>
              <span>{message.body}</span>
              <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
            </li>
          ))}
        </ol>
      )}
      <label className="field-stack" htmlFor="private-message-body">
        Message to citizen
        <textarea
          disabled={isPending || loadError !== null}
          id="private-message-body"
          maxLength={4_000}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          value={body}
        />
      </label>
      {error === null ? null : (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      {readReceiptWarning === null ? null : (
        <p className="warning-notice" role="status">
          {readReceiptWarning}
        </p>
      )}
      <button
        className="primary-button"
        disabled={isPending || loadError !== null || body.trim().length === 0}
        onClick={() => void submit()}
        type="button"
      >
        {isPending ? 'Sending…' : 'Send private message'}
      </button>
    </section>
  );
};
