import type { ApiConfiguration } from '@local-wellness/config';
import type { Device, Profile, RecordedAuthAuditEvent } from '@local-wellness/types';
import type {
  ActiveAccess,
  AppendAuthAuditEvent,
  DeviceRegistration,
  PersistedGovernmentInvitation,
  ProfileUpdate,
  RoleDefinition,
} from '../data/identity.store.js';
import { IdentityStore } from '../data/identity.store.js';
import {
  AuthenticationGateway,
  type InvitedAuthenticationUser,
} from '../auth/authentication.gateway.js';
import { Clock } from '../common/clock.js';

export const activeProfile: Profile = {
  id: '7cd50865-9ebd-4a79-abaa-f059a1632985',
  displayName: 'Asha Patil',
  phone: null,
  email: 'asha@example.com',
  preferredLanguage: 'mr',
  status: 'active',
  onboardingCompletedAt: null,
  createdAt: '2026-07-13T08:00:00.000Z',
  updatedAt: '2026-07-13T08:00:00.000Z',
};

export const apiConfiguration: ApiConfiguration = {
  allowedOrigins: ['https://citizen.example.com', 'https://government.example.com'],
  governmentInviteRedirectUrl: 'https://government.example.com/auth/callback',
  port: 3001,
  supabase: {
    anonKey: 'anon-key-for-tests',
    serviceRoleKey: 'service-role-key-for-tests',
    url: 'https://example.supabase.co',
  },
};

export class FixedClock extends Clock {
  public constructor(private readonly value = new Date('2026-07-13T10:00:00.000Z')) {
    super();
  }

  public now(): Date {
    return new Date(this.value);
  }
}

export class FakeIdentityStore extends IdentityStore {
  public profile: Profile | null = activeProfile;
  public access: ActiveAccess = { authorities: [], roles: [] };
  public role: RoleDefinition | null = null;
  public persistedInvitation: PersistedGovernmentInvitation = {
    membershipId: '41345ec3-491b-439b-ac9a-f5c2c1642099',
    roleAssignmentId: '2ae5c8ac-d2b0-41f4-bb1d-31528758ac42',
  };
  public reconciledInvitation: PersistedGovernmentInvitation | null = null;
  public persistenceError: Error | null = null;
  public lastDeviceRegistration: DeviceRegistration | null = null;
  public auditEvents: AppendAuthAuditEvent[] = [];
  public devices: Device[] = [];
  public revokeDeviceCalls = 0;

  public async appendAuthAuditEvent(input: AppendAuthAuditEvent): Promise<RecordedAuthAuditEvent> {
    this.auditEvents.push(input);
    return {
      id: '43272234-2182-4615-9158-d561e7b223f2',
      occurredAt: '2026-07-13T10:00:00.000Z',
    };
  }

  public async deviceBelongsToUser(): Promise<boolean> {
    return true;
  }

  public async findActiveAccess(): Promise<ActiveAccess> {
    return this.access;
  }

  public async findGovernmentInvitation(): Promise<PersistedGovernmentInvitation | null> {
    return this.reconciledInvitation;
  }

  public async findProfile(): Promise<Profile | null> {
    return this.profile;
  }

  public async findRoleByCode(): Promise<RoleDefinition | null> {
    return this.role;
  }

  public async listDevices(): Promise<Device[]> {
    return this.devices;
  }

  public async persistGovernmentInvitation(): Promise<PersistedGovernmentInvitation> {
    if (this.persistenceError) {
      throw this.persistenceError;
    }

    return this.persistedInvitation;
  }

  public async revokeDevice(): Promise<Device | null> {
    this.revokeDeviceCalls += 1;
    return this.devices[0] ?? null;
  }

  public async updateProfile(_userId: string, update: ProfileUpdate): Promise<Profile> {
    if (!this.profile) {
      throw new Error('Missing fake profile.');
    }

    this.profile = {
      ...this.profile,
      ...(update.displayName === undefined ? {} : { displayName: update.displayName }),
      ...(update.preferredLanguage === undefined
        ? {}
        : { preferredLanguage: update.preferredLanguage }),
      ...(update.onboardingCompletedAt === undefined
        ? {}
        : { onboardingCompletedAt: update.onboardingCompletedAt }),
    };
    return this.profile;
  }

  public async upsertDevice(_userId: string, input: DeviceRegistration): Promise<Device> {
    this.lastDeviceRegistration = input;
    const device: Device = {
      id: '7a6af88b-d00e-44dc-b21d-af5b778d1441',
      platform: input.platform,
      appVersion: input.appVersion ?? null,
      pushNotificationsEnabled: Boolean(input.pushToken),
      lastSeenAt: input.lastSeenAt,
      riskStatus: 'unknown',
      revokedAt: null,
      createdAt: input.lastSeenAt,
      updatedAt: input.lastSeenAt,
    };
    this.devices = [device];
    return device;
  }
}

export class FakeAuthenticationGateway extends AuthenticationGateway {
  public verifiedUser = {
    id: activeProfile.id,
    email: activeProfile.email,
    phone: activeProfile.phone,
  };
  public invitedUser: InvitedAuthenticationUser = {
    id: '813f699a-aa59-421d-aa5c-1e53d3c43fac',
    email: 'officer@example.com',
  };
  public inviteError: Error | null = null;
  public deletedUserIds: string[] = [];
  public invitationEmails: string[] = [];

  public async deleteInvitedUser(userId: string): Promise<void> {
    this.deletedUserIds.push(userId);
  }

  public async inviteGovernmentUser(email: string): Promise<InvitedAuthenticationUser> {
    this.invitationEmails.push(email);

    if (this.inviteError) {
      throw this.inviteError;
    }

    return { ...this.invitedUser, email };
  }

  public async verifyAccessToken(): Promise<typeof this.verifiedUser | null> {
    return this.verifiedUser;
  }
}
