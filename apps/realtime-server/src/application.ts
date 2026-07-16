import { randomUUID } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

import type { RealtimeConfiguration } from '@local-wellness/config';
import type {
  InAppNotification,
  MessageReadReceipt,
  RealtimeEventEnvelope,
  RealtimeMessageCreatedEvent,
  RealtimeNotificationCreatedEvent,
  RealtimeTypingChangedEvent,
  SocketMessageCreateInput,
  SocketMessageReadInput,
  SocketOperationAcknowledgement,
  SocketRoomJoinInput,
  SocketRoomLeaveInput,
  SocketTypingStartInput,
  SocketTypingStopInput,
} from '@local-wellness/types';
import {
  socketHandshakeAuthSchema,
  socketMessageCreateSchema,
  socketMessageReadSchema,
  socketOperationAcknowledgementSchema,
  socketRoomJoinSchema,
  socketRoomLeaveSchema,
  socketTypingStartSchema,
  socketTypingStopSchema,
} from '@local-wellness/validation';
import { Server, type RemoteSocket, type Socket } from 'socket.io';

import {
  RealtimeAuthenticationGateway,
  SupabaseRealtimeAuthenticationGateway,
} from './authentication.js';
import { RealtimeDeliveryPump } from './delivery-pump.js';
import { ConsoleRealtimeLogger, type RealtimeLogger } from './logger.js';
import {
  RealtimeStore,
  type ClaimedRealtimeDelivery,
  type PersistedComplaintMessage,
  type PersistedMessageReceipt,
  type RealtimeRoomAuthorization,
  type RealtimeRoomTarget,
} from './realtime-store.js';
import { SupabaseRealtimeStore } from './supabase-realtime-store.js';

type Acknowledge = (acknowledgement: SocketOperationAcknowledgement) => void;

interface ClientToServerEvents {
  'message:create': (input: SocketMessageCreateInput, acknowledge?: Acknowledge) => void;
  'message:read': (input: SocketMessageReadInput, acknowledge?: Acknowledge) => void;
  'room:join': (input: SocketRoomJoinInput, acknowledge?: Acknowledge) => void;
  'room:leave': (input: SocketRoomLeaveInput, acknowledge?: Acknowledge) => void;
  'typing:start': (input: SocketTypingStartInput, acknowledge?: Acknowledge) => void;
  'typing:stop': (input: SocketTypingStopInput, acknowledge?: Acknowledge) => void;
}

type ComplaintStatusChangedEvent = RealtimeEventEnvelope<InAppNotification>;
type MessageReadEvent = RealtimeEventEnvelope<MessageReadReceipt>;
interface ServerToClientEvents {
  'complaint:status_changed': (payload: ComplaintStatusChangedEvent) => void;
  'message:created': (payload: RealtimeMessageCreatedEvent) => void;
  'message:read': (payload: MessageReadEvent) => void;
  'notification:created': (payload: RealtimeNotificationCreatedEvent) => void;
  'typing:changed': (payload: RealtimeTypingChangedEvent) => void;
}

type InterServerEvents = Record<never, never>;

class SocketRateLimiter {
  private count = 0;
  private windowStartedAt = Date.now();

  public constructor(private readonly maximumPerMinute: number) {}

  public consume(at = Date.now()): boolean {
    if (at - this.windowStartedAt >= 60_000) {
      this.count = 0;
      this.windowStartedAt = at;
    }
    this.count += 1;
    return this.count <= this.maximumPerMinute;
  }
}

interface SocketData {
  authExpiresAtMilliseconds: number;
  rateLimiter: SocketRateLimiter;
  subscriptions: Set<string>;
  userId: string;
}

type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type RealtimeRemoteSocket = RemoteSocket<ServerToClientEvents, SocketData>;
type RealtimeSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type StrictSchema<Output> = Readonly<{
  safeParse(
    value: unknown,
  ): Readonly<{ data: Output; success: true }> | Readonly<{ success: false }>;
}>;

class SocketOperationFailure extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'SocketOperationFailure';
  }
}

const operationFailures = {
  accessDenied: () =>
    new SocketOperationFailure(
      'ACCESS_DENIED',
      'The requested realtime resource is unavailable.',
      false,
    ),
  capacityExceeded: () =>
    new SocketOperationFailure(
      'ROOM_LIMIT_REACHED',
      'Too many realtime rooms are already active.',
      false,
    ),
  dependencyUnavailable: () =>
    new SocketOperationFailure(
      'DEPENDENCY_UNAVAILABLE',
      'Realtime data is temporarily unavailable.',
      true,
    ),
  rateLimited: () =>
    new SocketOperationFailure('RATE_LIMITED', 'Too many realtime operations were received.', true),
  validation: () =>
    new SocketOperationFailure('VALIDATION_ERROR', 'The realtime request is invalid.', false),
} as const;

const realtimeRoomName = (target: RealtimeRoomTarget): string =>
  `${target.kind}:${target.resourceId}`;
const userRoomName = (userId: string): string => `user:${userId}`;

const toRoomTarget = (input: SocketRoomJoinInput | SocketRoomLeaveInput): RealtimeRoomTarget => ({
  kind: input.roomType,
  resourceId: input.roomId,
});

const complaintTarget = (complaintId: string): RealtimeRoomTarget => ({
  kind: 'complaint',
  resourceId: complaintId,
});

const successAcknowledgement = (resourceId?: string): SocketOperationAcknowledgement =>
  socketOperationAcknowledgementSchema.parse({
    ok: true,
    occurredAt: new Date().toISOString(),
    ...(resourceId === undefined ? {} : { resourceId }),
  });

const failureAcknowledgement = (error: SocketOperationFailure): SocketOperationAcknowledgement =>
  socketOperationAcknowledgementSchema.parse({
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    },
  });

const acknowledge = (
  callback: Acknowledge | undefined,
  value: SocketOperationAcknowledgement,
): void => {
  if (typeof callback === 'function') callback(value);
};

const writeHealthResponse = (
  response: ServerResponse,
  statusCode: number,
  status: string,
): void => {
  response.statusCode = statusCode;
  response.setHeader('cache-control', 'no-store');
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ status }));
};

const emitDeliveryEvent = (
  socket: RealtimeRemoteSocket,
  delivery: ClaimedRealtimeDelivery,
): void => {
  switch (delivery.eventName) {
    case 'complaint:status_changed':
      socket.emit('complaint:status_changed', {
        eventId: delivery.eventId,
        occurredAt: delivery.occurredAt,
        payload: delivery.payload,
        schemaVersion: 1,
      });
      break;
    case 'message:created':
      socket.emit('message:created', {
        eventId: delivery.eventId,
        occurredAt: delivery.occurredAt,
        payload: delivery.payload,
        schemaVersion: 1,
      });
      break;
    case 'notification:created':
      socket.emit('notification:created', {
        eventId: delivery.eventId,
        occurredAt: delivery.occurredAt,
        payload: delivery.payload,
        schemaVersion: 1,
      });
      break;
  }
};

const isOriginAllowed = (origin: string | undefined, allowedOrigins: Set<string>): boolean =>
  origin === undefined || allowedOrigins.has(origin);

export type RealtimeApplication = Readonly<{
  close: () => Promise<void>;
  deliveryPump: RealtimeDeliveryPump;
  httpServer: HttpServer;
  listen: (port?: number, host?: string) => Promise<AddressInfo>;
  socketServer: RealtimeSocketServer;
}>;

export const createRealtimeApplication = (options: {
  authenticationGateway?: RealtimeAuthenticationGateway;
  configuration: RealtimeConfiguration;
  logger?: RealtimeLogger;
  store?: RealtimeStore;
}): RealtimeApplication => {
  const { configuration } = options;
  const logger = options.logger ?? new ConsoleRealtimeLogger();
  const store =
    options.store ??
    new SupabaseRealtimeStore(configuration.supabase.url, configuration.supabase.serviceRoleKey);
  const authenticationGateway =
    options.authenticationGateway ??
    new SupabaseRealtimeAuthenticationGateway(
      configuration.supabase.url,
      configuration.supabase.anonKey,
      store,
    );
  const allowedOrigins = new Set(configuration.allowedOrigins);
  const runtimeState: { deliveryPump?: RealtimeDeliveryPump } = {};

  const httpServer = createServer((request: IncomingMessage, response: ServerResponse) => {
    if (request.method === 'GET' && request.url === '/health/live') {
      writeHealthResponse(response, 200, 'ok');
      return;
    }
    if (request.method === 'GET' && request.url === '/health/ready') {
      const ready = runtimeState.deliveryPump?.isReady() === true;
      writeHealthResponse(response, ready ? 200 : 503, ready ? 'ready' : 'not_ready');
      return;
    }
    writeHealthResponse(response, 404, 'not_found');
  });

  const socketServer: RealtimeSocketServer = new Server(httpServer, {
    allowRequest: (request, callback) => {
      callback(null, isOriginAllowed(request.headers.origin, allowedOrigins));
    },
    cors: {
      credentials: false,
      methods: ['GET', 'POST'],
      origin: (origin, callback) => {
        if (isOriginAllowed(origin, allowedOrigins)) {
          callback(null, true);
          return;
        }
        callback(new Error('ORIGIN_NOT_ALLOWED'));
      },
    },
    maxHttpBufferSize: configuration.maxHttpBufferSizeBytes,
    perMessageDeflate: false,
    serveClient: false,
  });

  const emitToAuthorizedComplaintRoom = async (
    complaintId: string,
    emit: (socket: RealtimeRemoteSocket) => void,
    excludedSocketId?: string,
  ): Promise<number> => {
    const target = complaintTarget(complaintId);
    const roomName = realtimeRoomName(target);
    const sockets = await socketServer.in(roomName).fetchSockets();
    const authorization = await Promise.all(
      sockets.map(async (socket) => ({
        authorization: await store.authorizeRoom(socket.data.userId, target),
        socket,
      })),
    );
    let emitted = 0;
    for (const result of authorization) {
      if (!result.authorization.authorized) {
        await result.socket.leave(roomName);
        result.socket.data.subscriptions.delete(roomName);
        continue;
      }
      if (result.socket.id === excludedSocketId) continue;
      emit(result.socket);
      emitted += 1;
    }
    return emitted;
  };

  const emitClaimedDelivery = async (delivery: ClaimedRealtimeDelivery): Promise<number> => {
    const sockets = await socketServer.in(userRoomName(delivery.recipientUserId)).fetchSockets();
    const authorization = await Promise.all(
      sockets.map(async (socket) => {
        const isExpectedUser = socket.data.userId === delivery.recipientUserId;
        const isActive = isExpectedUser && (await store.isActiveAccount(socket.data.userId));
        const hasComplaintAccess =
          isActive && delivery.complaintId !== null
            ? (await store.authorizeRoom(socket.data.userId, complaintTarget(delivery.complaintId)))
                .authorized
            : isActive;
        return { allowed: hasComplaintAccess, isActive, socket };
      }),
    );
    let emitted = 0;
    for (const result of authorization) {
      if (!result.isActive) {
        result.socket.disconnect(true);
        continue;
      }
      if (!result.allowed) continue;
      emitDeliveryEvent(result.socket, delivery);
      emitted += 1;
    }
    return emitted;
  };

  const deliveryPump = new RealtimeDeliveryPump(
    store,
    emitClaimedDelivery,
    configuration.delivery,
    logger,
  );
  runtimeState.deliveryPump = deliveryPump;

  socketServer.use(async (socket, next) => {
    const parsed = socketHandshakeAuthSchema.safeParse(socket.handshake.auth);
    if (!parsed.success) {
      next(new Error('AUTH_REQUIRED'));
      return;
    }
    try {
      const user = await authenticationGateway.authenticate(parsed.data.accessToken);
      if (!user) {
        next(new Error('AUTH_REQUIRED'));
        return;
      }
      socket.data.authExpiresAtMilliseconds = user.expiresAtMilliseconds;
      socket.data.rateLimiter = new SocketRateLimiter(configuration.eventRateLimitPerMinute);
      socket.data.subscriptions = new Set<string>();
      socket.data.userId = user.userId;
      next();
    } catch {
      next(new Error('AUTH_UNAVAILABLE'));
    }
  });

  const expiryTimers = new Map<string, NodeJS.Timeout>();

  socketServer.on('connection', (socket: RealtimeSocket) => {
    const userRoom = userRoomName(socket.data.userId);
    void socket.join(userRoom);
    const expiresIn = Math.max(0, socket.data.authExpiresAtMilliseconds - Date.now());
    const expiryTimer = setTimeout(
      () => socket.disconnect(true),
      Math.min(expiresIn, 2_147_000_000),
    );
    expiryTimer.unref();
    expiryTimers.set(socket.id, expiryTimer);
    logger.info('realtime_socket_connected', {
      socketId: socket.id,
    });

    const runOperation = async <Input>(
      event: string,
      schema: StrictSchema<Input>,
      input: unknown,
      callback: Acknowledge | undefined,
      operation: (value: Input, requestId: string) => Promise<string | undefined>,
    ): Promise<void> => {
      const requestId = randomUUID();
      try {
        if (!socket.data.rateLimiter.consume()) throw operationFailures.rateLimited();
        const parsed = schema.safeParse(input);
        if (!parsed.success) throw operationFailures.validation();
        const resourceId = await operation(parsed.data, requestId);
        acknowledge(callback, successAcknowledgement(resourceId));
      } catch (error) {
        const failure =
          error instanceof SocketOperationFailure
            ? error
            : new SocketOperationFailure(
                'INTERNAL_ERROR',
                'The realtime operation could not be completed.',
                true,
              );
        logger.warn('realtime_operation_failed', {
          code: failure.code,
          event,
          requestId,
          socketId: socket.id,
        });
        acknowledge(callback, failureAcknowledgement(failure));
      }
    };

    const authorize = async (target: RealtimeRoomTarget): Promise<RealtimeRoomAuthorization> => {
      try {
        const authorization = await store.authorizeRoom(socket.data.userId, target);
        if (!authorization.authorized) {
          throw operationFailures.accessDenied();
        }
        return authorization;
      } catch (error) {
        if (error instanceof SocketOperationFailure) throw error;
        throw operationFailures.dependencyUnavailable();
      }
    };

    socket.on('room:join', (input, callback) => {
      void runOperation('room:join', socketRoomJoinSchema, input, callback, async (value) => {
        const target = toRoomTarget(value);
        const roomName = realtimeRoomName(target);
        if (
          !socket.data.subscriptions.has(roomName) &&
          socket.data.subscriptions.size >= configuration.maxRoomsPerSocket
        ) {
          throw operationFailures.capacityExceeded();
        }
        await authorize(target);
        await socket.join(roomName);
        socket.data.subscriptions.add(roomName);
        return target.resourceId;
      });
    });

    socket.on('room:leave', (input, callback) => {
      void runOperation('room:leave', socketRoomLeaveSchema, input, callback, async (value) => {
        const target = toRoomTarget(value);
        const roomName = realtimeRoomName(target);
        await socket.leave(roomName);
        socket.data.subscriptions.delete(roomName);
        return target.resourceId;
      });
    });

    socket.on('message:create', (input, callback) => {
      void runOperation(
        'message:create',
        socketMessageCreateSchema,
        input,
        callback,
        async (value, requestId) => {
          await authorize(complaintTarget(value.complaintId));
          let message: PersistedComplaintMessage;
          try {
            message = await store.createComplaintMessage({
              body: value.body,
              clientMessageId: value.clientMessageId,
              complaintId: value.complaintId,
              requestId,
              userId: socket.data.userId,
            });
          } catch {
            throw operationFailures.dependencyUnavailable();
          }
          try {
            await emitToAuthorizedComplaintRoom(value.complaintId, (recipient) => {
              recipient.emit('message:created', {
                eventId: message.eventId,
                occurredAt: message.message.createdAt,
                payload: {
                  ...message.message,
                  authoredByMe: recipient.data.userId === message.senderUserId,
                },
                schemaVersion: 1,
              });
            });
          } catch {
            throw operationFailures.dependencyUnavailable();
          }
          logger.info('realtime_message_persisted', {
            complaintId: value.complaintId,
            eventId: message.eventId,
            messageId: message.message.id,
            requestId,
          });
          return message.message.id;
        },
      );
    });

    socket.on('message:read', (input, callback) => {
      void runOperation(
        'message:read',
        socketMessageReadSchema,
        input,
        callback,
        async (value, requestId) => {
          await authorize(complaintTarget(value.complaintId));
          let receipt: PersistedMessageReceipt;
          try {
            receipt = await store.markComplaintMessageRead({
              complaintId: value.complaintId,
              readThroughCreatedAt: value.readThroughCreatedAt,
              readThroughMessageId: value.readThroughMessageId,
              requestId,
              userId: socket.data.userId,
            });
          } catch {
            throw operationFailures.dependencyUnavailable();
          }
          const payload: MessageReadEvent = {
            eventId: receipt.eventId,
            occurredAt: receipt.receipt.updatedAt,
            payload: receipt.receipt,
            schemaVersion: 1,
          };
          try {
            await emitToAuthorizedComplaintRoom(value.complaintId, (recipient) => {
              recipient.emit('message:read', payload);
            });
          } catch {
            throw operationFailures.dependencyUnavailable();
          }
          return receipt.receipt.readThroughMessageId;
        },
      );
    });

    const handleTyping = (
      event: 'typing:start' | 'typing:stop',
      active: boolean,
      schema: StrictSchema<SocketTypingStartInput | SocketTypingStopInput>,
      input: SocketTypingStartInput | SocketTypingStopInput,
      callback: Acknowledge | undefined,
    ): void => {
      void runOperation(event, schema, input, callback, async (value) => {
        const authorization = await authorize(complaintTarget(value.complaintId));
        if (authorization.authorType === null) throw operationFailures.dependencyUnavailable();
        const payload: RealtimeTypingChangedEvent = {
          eventId: randomUUID(),
          occurredAt: new Date().toISOString(),
          payload: {
            active,
            authorType: authorization.authorType,
            complaintId: value.complaintId,
          },
          schemaVersion: 1,
        };
        try {
          await emitToAuthorizedComplaintRoom(
            value.complaintId,
            (recipient) => recipient.emit('typing:changed', payload),
            socket.id,
          );
        } catch {
          throw operationFailures.dependencyUnavailable();
        }
        return value.complaintId;
      });
    };

    socket.on('typing:start', (input, callback) => {
      handleTyping('typing:start', true, socketTypingStartSchema, input, callback);
    });
    socket.on('typing:stop', (input, callback) => {
      handleTyping('typing:stop', false, socketTypingStopSchema, input, callback);
    });

    socket.on('disconnect', (reason) => {
      const timer = expiryTimers.get(socket.id);
      if (timer) clearTimeout(timer);
      expiryTimers.delete(socket.id);
      logger.info('realtime_socket_disconnected', {
        reason,
        socketId: socket.id,
      });
    });
  });

  let isClosing = false;
  const close = async (): Promise<void> => {
    if (isClosing) return;
    isClosing = true;
    await deliveryPump.stop();
    for (const timer of expiryTimers.values()) clearTimeout(timer);
    expiryTimers.clear();
    await new Promise<void>((resolve) => {
      socketServer.close(() => resolve());
      if (!httpServer.listening) resolve();
    });
  };

  const listen = async (port = configuration.port, host?: string): Promise<AddressInfo> => {
    if (httpServer.listening) throw new Error('The realtime server is already listening.');
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        httpServer.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        httpServer.off('error', onError);
        resolve();
      };
      httpServer.once('error', onError);
      httpServer.once('listening', onListening);
      if (host === undefined) httpServer.listen(port);
      else httpServer.listen(port, host);
    });
    const address = httpServer.address();
    if (address === null || typeof address === 'string') {
      throw new Error('The realtime server did not bind to a TCP address.');
    }
    deliveryPump.start();
    return address;
  };

  return { close, deliveryPump, httpServer, listen, socketServer };
};
