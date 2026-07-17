import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GovernmentInvitationsService } from '../admin/government-invitations.service.js';
import { ApiException } from '../common/api-exception.js';
import {
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
  FixedClock,
} from './test-doubles.js';

const authorityId = '1579439f-6e87-46d4-8411-e6559f4ddf51';

const configureMunicipalAdmin = (identityStore: FakeIdentityStore): void => {
  identityStore.access = {
    roles: [
      {
        assignmentId: 'dd5df9ca-0e7f-45c4-93c5-c6db4c8161bf',
        authorityId,
        roleId: '6e59a3c4-7853-499d-b61c-cbc503d495fb',
        code: 'municipal_admin',
        name: 'Municipal administrator',
        description: null,
        isGovernment: true,
        isPrivileged: true,
        scopeType: 'authority',
        scopeId: authorityId,
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        effectiveUntil: null,
      },
    ],
    authorities: [
      {
        membershipId: 'a5ba57d2-f9b2-4c88-bb9c-3815fd506b03',
        authorityId,
        status: 'active',
        invitationEmail: 'admin@example.com',
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        effectiveUntil: null,
      },
    ],
  };
  identityStore.role = {
    id: 'b4bfa2ba-37e0-455c-8eb1-57b0f1126159',
    code: 'government_operator',
    name: 'Government operator',
    description: null,
    isGovernment: true,
    isPrivileged: false,
  };
};

const createService = (
  identityStore: FakeIdentityStore,
  authenticationGateway: FakeAuthenticationGateway,
): GovernmentInvitationsService =>
  new GovernmentInvitationsService(
    identityStore,
    authenticationGateway,
    new FixedClock(),
    apiConfiguration,
  );

describe('government invitation service', () => {
  it('lists every verified invitation option for a platform administrator', async () => {
    const identityStore = new FakeIdentityStore();
    const authenticationGateway = new FakeAuthenticationGateway();
    identityStore.access.roles = [
      {
        assignmentId: 'dd5df9ca-0e7f-45c4-93c5-c6db4c8161bf',
        authorityId: null,
        roleId: '6e59a3c4-7853-499d-b61c-cbc503d495fb',
        code: 'platform_admin',
        name: 'Platform administrator',
        description: null,
        isGovernment: false,
        isPrivileged: true,
        scopeType: 'global',
        scopeId: null,
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        effectiveUntil: null,
      },
    ];
    identityStore.governmentInvitationOptions = {
      authorities: [
        {
          authorityType: 'municipal_corporation',
          code: 'BMC',
          id: authorityId,
          name: 'Brihanmumbai Municipal Corporation',
        },
      ],
      departments: [],
      wards: [],
    };

    const options = await createService(identityStore, authenticationGateway).listInvitationOptions(
      identityStore.profile?.id ?? '',
    );

    assert.equal(options.authorities[0]?.code, 'BMC');
    assert.equal(identityStore.governmentInvitationAuthorityFilter, null);
  });

  it('limits municipal invitation options to the administrator authority', async () => {
    const identityStore = new FakeIdentityStore();
    const authenticationGateway = new FakeAuthenticationGateway();
    configureMunicipalAdmin(identityStore);

    await createService(identityStore, authenticationGateway).listInvitationOptions(
      identityStore.profile?.id ?? '',
    );

    assert.deepEqual(identityStore.governmentInvitationAuthorityFilter, [authorityId]);
  });

  it('does not expose invitation options to a signed-in user without administrator scope', async () => {
    const identityStore = new FakeIdentityStore();
    const authenticationGateway = new FakeAuthenticationGateway();

    await assert.rejects(
      createService(identityStore, authenticationGateway).listInvitationOptions(
        identityStore.profile?.id ?? '',
      ),
      (error: unknown) => error instanceof ApiException && error.code === 'ACCESS_DENIED',
    );

    assert.equal(identityStore.governmentInvitationAuthorityFilter, undefined);
  });

  it('does not expose invitation options for an inactive administrator profile', async () => {
    const identityStore = new FakeIdentityStore();
    const authenticationGateway = new FakeAuthenticationGateway();
    configureMunicipalAdmin(identityStore);

    if (!identityStore.profile) {
      throw new Error('The test profile is required.');
    }

    identityStore.profile = { ...identityStore.profile, status: 'disabled' };

    await assert.rejects(
      createService(identityStore, authenticationGateway).listInvitationOptions(
        identityStore.profile.id,
      ),
      (error: unknown) => error instanceof ApiException && error.code === 'ACCESS_DENIED',
    );

    assert.equal(identityStore.governmentInvitationAuthorityFilter, undefined);
  });

  it('allows a municipal admin to invite a non-privileged user in matching scope', async () => {
    const identityStore = new FakeIdentityStore();
    const authenticationGateway = new FakeAuthenticationGateway();
    configureMunicipalAdmin(identityStore);

    const invitation = await createService(identityStore, authenticationGateway).createInvitation(
      identityStore.profile?.id ?? '',
      {
        email: 'officer@example.com',
        authorityId,
        roleCode: 'government_operator',
        scopeType: 'authority',
      },
    );

    assert.equal(invitation.authorityId, authorityId);
    assert.equal(invitation.roleCode, 'government_operator');
    assert.deepEqual(authenticationGateway.invitationEmails, ['officer@example.com']);
  });

  it('blocks municipal cross-authority role escalation before sending an invitation', async () => {
    const identityStore = new FakeIdentityStore();
    const authenticationGateway = new FakeAuthenticationGateway();
    configureMunicipalAdmin(identityStore);

    await assert.rejects(
      createService(identityStore, authenticationGateway).createInvitation(
        identityStore.profile?.id ?? '',
        {
          email: 'officer@example.com',
          authorityId: '7a6af88b-d00e-44dc-b21d-af5b778d1441',
          roleCode: 'government_operator',
          scopeType: 'authority',
        },
      ),
      (error: unknown) => error instanceof ApiException && error.code === 'ACCESS_DENIED',
    );

    assert.deepEqual(authenticationGateway.invitationEmails, []);
    assert.deepEqual(identityStore.auditEvents, [
      {
        actorUserId: identityStore.profile?.id ?? '',
        authorityId: '7a6af88b-d00e-44dc-b21d-af5b778d1441',
        eventType: 'government_invitation_failed',
        metadata: {
          failureStage: 'authorization',
          roleCode: 'government_operator',
        },
        outcome: 'failure',
        subjectUserId: null,
      },
    ]);
  });

  it('blocks a pending administrator before sending an Auth invitation', async () => {
    const identityStore = new FakeIdentityStore();
    const authenticationGateway = new FakeAuthenticationGateway();
    configureMunicipalAdmin(identityStore);

    if (!identityStore.profile) {
      throw new Error('The test profile is required.');
    }

    identityStore.profile = {
      ...identityStore.profile,
      status: 'pending',
    };

    await assert.rejects(
      createService(identityStore, authenticationGateway).createInvitation(
        identityStore.profile.id,
        {
          email: 'officer@example.com',
          authorityId,
          roleCode: 'government_operator',
          scopeType: 'authority',
        },
      ),
      (error: unknown) => error instanceof ApiException && error.code === 'ACCESS_DENIED',
    );

    assert.deepEqual(authenticationGateway.invitationEmails, []);
  });

  it('blocks a municipal admin from granting a privileged role', async () => {
    const identityStore = new FakeIdentityStore();
    const authenticationGateway = new FakeAuthenticationGateway();
    configureMunicipalAdmin(identityStore);
    identityStore.role = {
      id: '00000000-0000-4000-8000-000000000005',
      code: 'municipal_admin',
      name: 'Municipal administrator',
      description: null,
      isGovernment: true,
      isPrivileged: true,
    };

    await assert.rejects(
      createService(identityStore, authenticationGateway).createInvitation(
        identityStore.profile?.id ?? '',
        {
          email: 'another-admin@example.com',
          authorityId,
          roleCode: 'municipal_admin',
          scopeType: 'authority',
        },
      ),
      (error: unknown) => error instanceof ApiException && error.code === 'ACCESS_DENIED',
    );

    assert.deepEqual(authenticationGateway.invitationEmails, []);
  });

  it('rolls back a newly invited Auth user when database persistence fails', async () => {
    const identityStore = new FakeIdentityStore();
    const authenticationGateway = new FakeAuthenticationGateway();
    configureMunicipalAdmin(identityStore);
    identityStore.persistenceError = new Error('database unavailable');

    await assert.rejects(
      createService(identityStore, authenticationGateway).createInvitation(
        identityStore.profile?.id ?? '',
        {
          email: 'officer@example.com',
          authorityId,
          roleCode: 'government_operator',
          scopeType: 'authority',
        },
      ),
      (error: unknown) => error instanceof ApiException && error.code === 'DEPENDENCY_UNAVAILABLE',
    );

    assert.deepEqual(authenticationGateway.deletedUserIds, [authenticationGateway.invitedUser.id]);
    assert.deepEqual(identityStore.auditEvents, [
      {
        actorUserId: identityStore.profile?.id ?? '',
        authorityId,
        eventType: 'government_invitation_failed',
        metadata: {
          failureStage: 'persistence',
          roleCode: 'government_operator',
        },
        outcome: 'failure',
        subjectUserId: authenticationGateway.invitedUser.id,
      },
    ]);
  });

  it('reconciles an ambiguous persistence error without deleting a provisioned user', async () => {
    const identityStore = new FakeIdentityStore();
    const authenticationGateway = new FakeAuthenticationGateway();
    configureMunicipalAdmin(identityStore);
    identityStore.persistenceError = new Error('connection closed after commit');
    identityStore.reconciledInvitation = identityStore.persistedInvitation;

    const invitation = await createService(identityStore, authenticationGateway).createInvitation(
      identityStore.profile?.id ?? '',
      {
        email: 'officer@example.com',
        authorityId,
        roleCode: 'government_operator',
        scopeType: 'authority',
      },
    );

    assert.equal(invitation.membershipId, identityStore.persistedInvitation.membershipId);
    assert.deepEqual(authenticationGateway.deletedUserIds, []);
  });
});
