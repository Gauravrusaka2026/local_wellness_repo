import { Inject, Injectable } from '@nestjs/common';
import type { Database, Tables, TablesInsert, TablesUpdate } from '@local-wellness/database';
import {
  accessScopeTypes,
  authorityMembershipStatuses,
  devicePlatforms,
  deviceRiskStatuses,
  profileStatuses,
  supportedLanguages,
  type AccessRole,
  type AuthorityMembership,
  type Device,
  type DevicePlatform,
  type DeviceRiskStatus,
  type Profile,
  type ProfileStatus,
  type SupportedLanguage,
} from '@local-wellness/types';

import {
  DeviceBlockedError,
  DeviceRevokedError,
  IdentityDataAccessError,
  IdentityStore,
  type ActiveAccess,
  type AppendAuthAuditEvent,
  type DeviceRegistration,
  type PersistedGovernmentInvitation,
  type PersistGovernmentInvitation,
  type ProfileUpdate,
  type RoleDefinition,
} from '../data/identity.store.js';
import { SupabaseClients } from './supabase-clients.js';

type ProfileRow = Tables<'profiles'>;
type DeviceRow = Tables<'devices'>;
type RoleRow = Tables<'roles'>;
type UserRoleRow = Tables<'user_roles'>;
type MembershipRow = Tables<'authority_memberships'>;
type RegisterDeviceArguments = Database['public']['Functions']['register_device']['Args'];
type ProvisionGovernmentInvitationArguments =
  Database['public']['Functions']['provision_government_invitation']['Args'];

const profileColumns =
  'id,display_name,phone,email,preferred_language,status,onboarding_completed_at,created_at,updated_at';
const deviceColumns =
  'id,platform,app_version,push_token,last_seen_at,risk_status,revoked_at,created_at,updated_at';
const roleColumns = 'id,code,name,description,is_government,is_privileged';

const hasDatabaseErrorMarker = (
  error: Readonly<{ message: string }> | null,
  marker: string,
): boolean => error?.message === marker;

const includesValue = <Value extends string>(
  values: readonly Value[],
  value: string,
): value is Value => values.includes(value as Value);

const decodeProfile = (
  row: Pick<
    ProfileRow,
    | 'id'
    | 'display_name'
    | 'phone'
    | 'email'
    | 'preferred_language'
    | 'status'
    | 'onboarding_completed_at'
    | 'created_at'
    | 'updated_at'
  >,
): Profile => {
  if (
    !includesValue(supportedLanguages, row.preferred_language) ||
    !includesValue(profileStatuses, row.status)
  ) {
    throw new IdentityDataAccessError('decode profile');
  }

  return {
    id: row.id,
    displayName: row.display_name,
    phone: row.phone,
    email: row.email,
    preferredLanguage: row.preferred_language as SupportedLanguage,
    status: row.status as ProfileStatus,
    onboardingCompletedAt: row.onboarding_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const decodeDevice = (
  row: Pick<
    DeviceRow,
    | 'id'
    | 'platform'
    | 'app_version'
    | 'push_token'
    | 'last_seen_at'
    | 'risk_status'
    | 'revoked_at'
    | 'created_at'
    | 'updated_at'
  >,
): Device => {
  if (
    !includesValue(devicePlatforms, row.platform) ||
    !includesValue(deviceRiskStatuses, row.risk_status)
  ) {
    throw new IdentityDataAccessError('decode device');
  }

  return {
    id: row.id,
    platform: row.platform as DevicePlatform,
    appVersion: row.app_version,
    pushNotificationsEnabled: row.push_token !== null,
    lastSeenAt: row.last_seen_at,
    riskStatus: row.risk_status as DeviceRiskStatus,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const decodeRoleDefinition = (
  row: Pick<RoleRow, 'id' | 'code' | 'name' | 'description' | 'is_government' | 'is_privileged'>,
): RoleDefinition => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  isGovernment: row.is_government,
  isPrivileged: row.is_privileged,
});

const decodeMembership = (
  row: Pick<
    MembershipRow,
    'id' | 'authority_id' | 'status' | 'invitation_email' | 'effective_from' | 'effective_until'
  >,
): AuthorityMembership => {
  if (!includesValue(authorityMembershipStatuses, row.status)) {
    throw new IdentityDataAccessError('decode authority membership');
  }

  return {
    membershipId: row.id,
    authorityId: row.authority_id,
    status: row.status,
    invitationEmail: row.invitation_email,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
  };
};

const decodeAccessRole = (
  assignment: Pick<
    UserRoleRow,
    | 'id'
    | 'authority_id'
    | 'role_id'
    | 'scope_type'
    | 'scope_id'
    | 'effective_from'
    | 'effective_until'
  >,
  role: RoleDefinition,
): AccessRole => {
  if (!includesValue(accessScopeTypes, assignment.scope_type)) {
    throw new IdentityDataAccessError('decode role assignment');
  }

  return {
    assignmentId: assignment.id,
    authorityId: assignment.authority_id,
    roleId: assignment.role_id,
    code: role.code,
    name: role.name,
    description: role.description,
    isGovernment: role.isGovernment,
    isPrivileged: role.isPrivileged,
    scopeType: assignment.scope_type,
    scopeId: assignment.scope_id,
    effectiveFrom: assignment.effective_from,
    effectiveUntil: assignment.effective_until,
  };
};

@Injectable()
export class SupabaseIdentityStore extends IdentityStore {
  public constructor(@Inject(SupabaseClients) private readonly clients: SupabaseClients) {
    super();
  }

  public async findProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.clients.serviceRoleClient
      .from('profiles')
      .select(profileColumns)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new IdentityDataAccessError('find profile');
    }

    return data ? decodeProfile(data) : null;
  }

  public async updateProfile(userId: string, update: ProfileUpdate): Promise<Profile> {
    const persistenceUpdate: TablesUpdate<'profiles'> = {
      ...(update.displayName === undefined ? {} : { display_name: update.displayName }),
      ...(update.onboardingCompletedAt === undefined
        ? {}
        : { onboarding_completed_at: update.onboardingCompletedAt }),
      ...(update.preferredLanguage === undefined
        ? {}
        : { preferred_language: update.preferredLanguage }),
    };
    const { data, error } = await this.clients.serviceRoleClient
      .from('profiles')
      .update(persistenceUpdate)
      .eq('id', userId)
      .select(profileColumns)
      .single();

    if (error || !data) {
      throw new IdentityDataAccessError('update profile');
    }

    return decodeProfile(data);
  }

  public async listDevices(userId: string): Promise<Device[]> {
    const { data, error } = await this.clients.serviceRoleClient
      .from('devices')
      .select(deviceColumns)
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false });

    if (error) {
      throw new IdentityDataAccessError('list devices');
    }

    return data.map(decodeDevice);
  }

  public async upsertDevice(userId: string, input: DeviceRegistration): Promise<Device> {
    const registrationArguments = {
      p_device_identifier_hash: input.deviceIdentifierHash,
      p_last_seen_at: input.lastSeenAt,
      p_platform: input.platform,
      p_push_token_supplied: input.pushToken !== undefined,
      p_user_id: userId,
      ...(input.appVersion === undefined ? {} : { p_app_version: input.appVersion }),
      ...(input.pushToken === undefined ? {} : { p_push_token: input.pushToken }),
    } as unknown as RegisterDeviceArguments;
    const { data, error } = await this.clients.serviceRoleClient.rpc(
      'register_device',
      registrationArguments,
    );

    if (hasDatabaseErrorMarker(error, 'DEVICE_BLOCKED')) {
      throw new DeviceBlockedError();
    }

    if (hasDatabaseErrorMarker(error, 'DEVICE_REVOKED')) {
      throw new DeviceRevokedError();
    }

    if (error || !data) {
      throw new IdentityDataAccessError('register device');
    }

    return decodeDevice(data);
  }

  public async revokeDevice(
    userId: string,
    deviceId: string,
    revokedAt: string,
  ): Promise<Device | null> {
    const { data, error } = await this.clients.serviceRoleClient.rpc('revoke_device', {
      p_device_id: deviceId,
      p_revoked_at: revokedAt,
      p_user_id: userId,
    });

    if (hasDatabaseErrorMarker(error, 'DEVICE_NOT_FOUND')) {
      return null;
    }

    if (error || !data) {
      throw new IdentityDataAccessError('revoke device');
    }

    return decodeDevice(data);
  }

  public async deviceBelongsToUser(deviceId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.clients.serviceRoleClient
      .from('devices')
      .select('id')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new IdentityDataAccessError('verify device ownership');
    }

    return data !== null;
  }

  public async findActiveAccess(userId: string, at: string): Promise<ActiveAccess> {
    const [assignmentsResult, membershipsResult] = await Promise.all([
      this.clients.serviceRoleClient.rpc('get_active_user_roles', {
        p_at: at,
        p_user_id: userId,
      }),
      this.clients.serviceRoleClient.rpc('get_active_authority_memberships', {
        p_at: at,
        p_user_id: userId,
      }),
    ]);

    if (assignmentsResult.error || membershipsResult.error) {
      throw new IdentityDataAccessError('find active access');
    }

    const authorities = membershipsResult.data.map(decodeMembership);
    const activeAuthorityIds = new Set(authorities.map((membership) => membership.authorityId));
    const assignments = assignmentsResult.data.filter(
      (assignment) =>
        assignment.scope_type === 'global' ||
        (assignment.authority_id !== null && activeAuthorityIds.has(assignment.authority_id)),
    );
    const roleIds = [...new Set(assignments.map((assignment) => assignment.role_id))];
    let roleRows: Pick<
      RoleRow,
      'id' | 'code' | 'name' | 'description' | 'is_government' | 'is_privileged'
    >[] = [];

    if (roleIds.length > 0) {
      const rolesResult = await this.clients.serviceRoleClient
        .from('roles')
        .select(roleColumns)
        .in('id', roleIds);

      if (rolesResult.error) {
        throw new IdentityDataAccessError('find access roles');
      }

      roleRows = rolesResult.data;
    }

    const rolesById = new Map(
      roleRows.map((roleRow) => [roleRow.id, decodeRoleDefinition(roleRow)]),
    );
    const roles = assignments.map((assignment) => {
      const role = rolesById.get(assignment.role_id);

      if (!role) {
        throw new IdentityDataAccessError('resolve role assignment');
      }

      return decodeAccessRole(assignment, role);
    });
    return {
      roles,
      authorities,
    };
  }

  public async findRoleByCode(code: string): Promise<RoleDefinition | null> {
    const { data, error } = await this.clients.serviceRoleClient
      .from('roles')
      .select(roleColumns)
      .eq('code', code)
      .maybeSingle();

    if (error) {
      throw new IdentityDataAccessError('find role');
    }

    return data ? decodeRoleDefinition(data) : null;
  }

  public async appendAuthAuditEvent(input: AppendAuthAuditEvent) {
    const event: TablesInsert<'auth_audit_events'> = {
      actor_user_id: input.actorUserId,
      subject_user_id: input.subjectUserId,
      event_type: input.eventType,
      outcome: input.outcome,
      ...(input.authorityId === undefined ? {} : { authority_id: input.authorityId }),
      ...(input.deviceId === undefined ? {} : { device_id: input.deviceId }),
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    };
    const { data, error } = await this.clients.serviceRoleClient
      .from('auth_audit_events')
      .insert(event)
      .select('id,occurred_at')
      .single();

    if (error || !data) {
      throw new IdentityDataAccessError('append authentication audit event');
    }

    return {
      id: data.id,
      occurredAt: data.occurred_at,
    };
  }

  public async persistGovernmentInvitation(
    input: PersistGovernmentInvitation,
  ): Promise<PersistedGovernmentInvitation> {
    if (!input.scopeId) {
      throw new IdentityDataAccessError('validate government invitation scope');
    }

    const invitationArguments = {
      actor_user_id: input.actorUserId,
      authority_id: input.authorityId,
      effective_from: input.effectiveFrom,
      effective_until: input.effectiveUntil,
      invitation_email: input.email,
      invited_user_id: input.invitedUserId,
      role_id: input.role.id,
      scope_id: input.scopeId,
      scope_type: input.scopeType,
    } as unknown as ProvisionGovernmentInvitationArguments;
    const { data, error } = await this.clients.serviceRoleClient.rpc(
      'provision_government_invitation',
      invitationArguments,
    );
    const invitation = data?.[0];

    if (error || !invitation) {
      throw new IdentityDataAccessError('provision government invitation');
    }

    return {
      membershipId: invitation.membership_id,
      roleAssignmentId: invitation.role_assignment_id,
    };
  }

  public async findGovernmentInvitation(
    userId: string,
    authorityId: string,
    roleId: string,
    scopeType: PersistGovernmentInvitation['scopeType'],
    scopeId: string,
  ): Promise<PersistedGovernmentInvitation | null> {
    const [membershipResult, assignmentResult] = await Promise.all([
      this.clients.serviceRoleClient
        .from('authority_memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('authority_id', authorityId)
        .eq('status', 'active')
        .maybeSingle(),
      this.clients.serviceRoleClient
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('authority_id', authorityId)
        .eq('scope_type', scopeType)
        .eq('scope_id', scopeId)
        .eq('status', 'active')
        .maybeSingle(),
    ]);

    if (membershipResult.error || assignmentResult.error) {
      throw new IdentityDataAccessError('reconcile government invitation');
    }

    if (!membershipResult.data || !assignmentResult.data) {
      return null;
    }

    return {
      membershipId: membershipResult.data.id,
      roleAssignmentId: assignmentResult.data.id,
    };
  }
}
