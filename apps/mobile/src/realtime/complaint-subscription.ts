import { io, type Socket } from 'socket.io-client';

import { getPublicRealtimeUrl } from '../config/environment';

export interface ComplaintRealtimeSubscription {
  close(): void;
}

type ComplaintRealtimeEventName =
  'complaint:status_changed' | 'message:created' | 'notification:created';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const realtimeEventMatchesComplaint = (
  eventName: ComplaintRealtimeEventName,
  event: unknown,
  complaintId: string,
): boolean => {
  if (!isRecord(event) || !isRecord(event['payload'])) {
    return false;
  }

  const payload = event['payload'];
  if (eventName === 'message:created') {
    return payload['complaintId'] === complaintId;
  }

  return isRecord(payload['payload']) && payload['payload']['complaintId'] === complaintId;
};

const createSocket = (realtimeUrl: string, accessToken: string): Socket =>
  io(realtimeUrl, {
    auth: { accessToken },
    autoConnect: true,
    reconnection: true,
    transports: ['websocket', 'polling'],
  });

const createRefreshScheduler = (onPersistentChange: () => void) => {
  let closed = false;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    close: (): void => {
      closed = true;
      if (refreshTimer !== null) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    },
    schedule: (): void => {
      if (closed || refreshTimer !== null) {
        return;
      }
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (!closed) onPersistentChange();
      }, 150);
    },
  };
};

export const subscribeToComplaintEvents = (
  accessToken: string,
  complaintId: string,
  onPersistentChange: () => void,
): ComplaintRealtimeSubscription | null => {
  const realtimeUrl = getPublicRealtimeUrl();
  if (realtimeUrl === null) {
    return null;
  }

  const socket = createSocket(realtimeUrl, accessToken);
  const refresh = createRefreshScheduler(onPersistentChange);
  const join = (): void => {
    socket.emit('room:join', { roomId: complaintId, roomType: 'complaint' });
  };
  const scheduleFor =
    (eventName: ComplaintRealtimeEventName) =>
    (event: unknown): void => {
      if (realtimeEventMatchesComplaint(eventName, event, complaintId)) {
        refresh.schedule();
      }
    };

  socket.on('connect', join);
  socket.on('complaint:status_changed', scheduleFor('complaint:status_changed'));
  socket.on('message:created', scheduleFor('message:created'));
  socket.on('notification:created', scheduleFor('notification:created'));

  return {
    close: () => {
      refresh.close();
      if (socket.connected) {
        socket.emit('room:leave', { roomId: complaintId, roomType: 'complaint' });
      }
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
};

export const subscribeToNotificationEvents = (
  accessToken: string,
  onPersistentChange: () => void,
): ComplaintRealtimeSubscription | null => {
  const realtimeUrl = getPublicRealtimeUrl();
  if (realtimeUrl === null) {
    return null;
  }

  const socket = createSocket(realtimeUrl, accessToken);
  const refresh = createRefreshScheduler(onPersistentChange);
  socket.on('complaint:status_changed', refresh.schedule);
  socket.on('message:created', refresh.schedule);
  socket.on('notification:created', refresh.schedule);

  return {
    close: () => {
      refresh.close();
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
};
