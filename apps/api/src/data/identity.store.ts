import type {
  AccessRole,
  AuthorityMembership,
  Device,
  DevicePlatform,
  GovernmentInvitationOptions,
  JsonObject,
  Profile,
  RecordAuthAuditEventInput,
  RecordedAuthAuditEvent,
  SupportedLanguage,
} from '@local-wellness/types';

export interface ProfileUpdate {
  avatarObjectPath?: string | null;
  displayName?: string;
  onboardingCompletedAt?: string;
  preferredLanguage?: SupportedLanguage;
}

export interface DeviceRegistration {
  appVersion?: string;
  deviceIdentifierHash: string;
  lastSeenAt: string;
  platform: DevicePlatform;
  pushToken?: string | null;
}

export interface RoleDefinition {
  code: string;
  description: string | null;
  id: string;
  isGovernment: boolean;
  isPrivileged: boolean;
  name: string;
}

export interface PersistGovernmentInvitation {
  actorUserId: string;
  authorityId: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  email: string;
  invitedUserId: string;
  role: RoleDefinition;
  scopeId: string | null;
  scopeType: 'global' | 'authority' | 'ward' | 'department';
}

export interface PersistedGovernmentInvitation {
  membershipId: string;
  roleAssignmentId: string;
}

export interface AppendAuthAuditEvent {
  actorUserId: string | null;
  authorityId?: string;
  deviceId?: string;
  eventType: RecordAuthAuditEventInput['eventType'];
  metadata?: JsonObject;
  outcome: RecordAuthAuditEventInput['outcome'];
  subjectUserId: string | null;
}

export interface ActiveAccess {
  authorities: AuthorityMembership[];
  roles: AccessRole[];
}

export class IdentityDataAccessError extends Error {
  public constructor(public readonly operation: string) {
    super(`Identity persistence operation failed: ${operation}.`);
    this.name = 'IdentityDataAccessError';
  }
}

export class DeviceBlockedError extends Error {
  public constructor() {
    super('The device is blocked.');
    this.name = 'DeviceBlockedError';
  }
}

export class DeviceRevokedError extends Error {
  public constructor() {
    super('The device registration has been revoked.');
    this.name = 'DeviceRevokedError';
  }
}

export class DeviceLimitReachedError extends Error {
  public constructor() {
    super('The active device limit has been reached.');
    this.name = 'DeviceLimitReachedError';
  }
}

export abstract class IdentityStore {
  public abstract appendAuthAuditEvent(
    input: AppendAuthAuditEvent,
  ): Promise<RecordedAuthAuditEvent>;

  public abstract deviceBelongsToUser(deviceId: string, userId: string): Promise<boolean>;

  public abstract findActiveAccess(userId: string, at: string): Promise<ActiveAccess>;

  public abstract findGovernmentInvitation(
    userId: string,
    authorityId: string,
    roleId: string,
    scopeType: PersistGovernmentInvitation['scopeType'],
    scopeId: string,
  ): Promise<PersistedGovernmentInvitation | null>;

  public abstract findProfile(userId: string): Promise<Profile | null>;

  public abstract findRoleByCode(code: string): Promise<RoleDefinition | null>;

  public abstract listDevices(userId: string): Promise<Device[]>;

  public abstract listGovernmentInvitationOptions(
    authorityIds: readonly string[] | null,
  ): Promise<GovernmentInvitationOptions>;

  public abstract persistGovernmentInvitation(
    input: PersistGovernmentInvitation,
  ): Promise<PersistedGovernmentInvitation>;

  public abstract revokeDevice(
    userId: string,
    deviceId: string,
    revokedAt: string,
  ): Promise<Device | null>;

  public abstract updateProfile(userId: string, update: ProfileUpdate): Promise<Profile>;

  public abstract upsertDevice(userId: string, input: DeviceRegistration): Promise<Device>;

  public abstract userHasVerifiedPhone(userId: string): Promise<boolean>;

  public abstract userRequiresPrivilegedMfa(userId: string, at: string): Promise<boolean>;
}
