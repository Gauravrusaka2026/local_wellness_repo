export const supportedLanguages = ['en', 'hi', 'mr'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const profileStatuses = ['pending', 'active', 'suspended', 'disabled', 'deleted'] as const;
export type ProfileStatus = (typeof profileStatuses)[number];

export const devicePlatforms = ['android', 'ios', 'web'] as const;
export type DevicePlatform = (typeof devicePlatforms)[number];

export const deviceRiskStatuses = ['unknown', 'trusted', 'review', 'blocked'] as const;
export type DeviceRiskStatus = (typeof deviceRiskStatuses)[number];

export const accessScopeTypes = ['global', 'authority', 'ward', 'department'] as const;
export type AccessScopeType = (typeof accessScopeTypes)[number];

export const accessAssignmentStatuses = ['active', 'expired', 'revoked'] as const;
export type AccessAssignmentStatus = (typeof accessAssignmentStatuses)[number];

export const governmentInvitationRoleCodes = [
  'government_operator',
  'ward_officer',
  'department_officer',
  'municipal_admin',
  'moderator',
] as const;
export type GovernmentInvitationRoleCode = (typeof governmentInvitationRoleCodes)[number];

export const governmentInvitationRoleScopes: Readonly<
  Record<GovernmentInvitationRoleCode, Exclude<AccessScopeType, 'global'>>
> = {
  government_operator: 'authority',
  ward_officer: 'ward',
  department_officer: 'department',
  municipal_admin: 'authority',
  moderator: 'authority',
};

export const authorityMembershipStatuses = [
  'invited',
  'pending_approval',
  'active',
  'expired',
  'revoked',
] as const;
export type AuthorityMembershipStatus = (typeof authorityMembershipStatuses)[number];

export const authAuditEventTypes = [
  'sign_in_succeeded',
  'sign_in_failed',
  'sign_out_succeeded',
  'session_refreshed',
  'otp_requested',
  'otp_verified',
  'device_registered',
  'device_revoked',
  'government_invitation_created',
  'government_invitation_failed',
  'platform_admin_bootstrapped',
  'access_denied',
] as const;
export type AuthAuditEventType = (typeof authAuditEventTypes)[number];

export const authAuditOutcomes = ['success', 'failure'] as const;
export type AuthAuditOutcome = (typeof authAuditOutcomes)[number];

export const clientAuthAuditEventTypes = [
  'sign_in_succeeded',
  'sign_out_succeeded',
  'session_refreshed',
  'otp_verified',
] as const;
export type ClientAuthAuditEventType = (typeof clientAuthAuditEventTypes)[number];

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface ApiMeta {
  requestId: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: JsonObject;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
  meta: ApiMeta;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface Profile {
  id: string;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  preferredLanguage: SupportedLanguage;
  status: ProfileStatus;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  displayName?: string | undefined;
  preferredLanguage?: SupportedLanguage | undefined;
  onboardingCompleted?: true | undefined;
}

export interface Device {
  id: string;
  platform: DevicePlatform;
  appVersion: string | null;
  pushNotificationsEnabled: boolean;
  lastSeenAt: string;
  riskStatus: DeviceRiskStatus;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDeviceInput {
  deviceIdentifier: string;
  platform: DevicePlatform;
  appVersion?: string | undefined;
  pushToken?: string | null | undefined;
}

export interface RevokedDevice {
  id: string;
  revokedAt: string;
}

export interface AccessRole {
  assignmentId: string;
  authorityId: string | null;
  roleId: string;
  code: string;
  name: string;
  description: string | null;
  isGovernment: boolean;
  isPrivileged: boolean;
  scopeType: AccessScopeType;
  scopeId: string | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
}

export interface AuthorityMembership {
  membershipId: string;
  authorityId: string;
  status: AuthorityMembershipStatus;
  invitationEmail: string | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
}

export interface UserAccess {
  roles: AccessRole[];
  authorities: AuthorityMembership[];
}

export interface GovernmentAccessScope {
  roles: AccessRole[];
  authorities: AuthorityMembership[];
}

export interface RecordAuthAuditEventInput {
  eventType: AuthAuditEventType;
  outcome: AuthAuditOutcome;
  deviceId?: string;
  authorityId?: string;
  metadata?: JsonObject;
}

export interface RecordClientAuthAuditEventInput {
  eventType: ClientAuthAuditEventType;
  deviceId?: string | undefined;
  authorityId?: string | undefined;
  metadata?:
    | {
        authMethod?: 'phone_otp' | 'email_otp' | 'magic_link' | undefined;
        clientSurface?:
          'mobile' | 'citizen_web' | 'government_dashboard' | 'admin_console' | undefined;
        source?: string | undefined;
      }
    | undefined;
}

export interface RecordedAuthAuditEvent {
  id: string;
  occurredAt: string;
}

export interface CreateGovernmentInvitationInput {
  email: string;
  authorityId: string;
  roleCode: GovernmentInvitationRoleCode;
  scopeType: Exclude<AccessScopeType, 'global'>;
  scopeId?: string | undefined;
  effectiveUntil?: string | undefined;
}

export interface GovernmentInvitation {
  userId: string;
  email: string;
  authorityId: string;
  roleCode: GovernmentInvitationRoleCode;
  scopeType: Exclude<AccessScopeType, 'global'>;
  scopeId: string;
  membershipId: string;
  roleAssignmentId: string;
  authInvitationStatus: 'invited';
  membershipStatus: 'active';
  roleStatus: 'active';
}

export * from './governance.js';
