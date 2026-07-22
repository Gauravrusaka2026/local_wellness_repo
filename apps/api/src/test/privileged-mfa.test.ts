import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ExecutionContext } from '@nestjs/common';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { ApiException } from '../common/api-exception.js';
import type { RequestContext } from '../common/request-context.js';
import { AuthenticationProviderUnavailableError } from '../auth/authentication.gateway.js';
import { SupabaseAuthenticationGateway } from '../supabase/supabase-authentication.gateway.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';
import { apiConfiguration, FakeAuthenticationGateway, FakeIdentityStore } from './test-doubles.js';

const createContext = (request: RequestContext): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('privileged MFA API enforcement', () => {
  it('observes AAL1 without locking out an existing privileged account', async () => {
    const gateway = new FakeAuthenticationGateway();
    const store = new FakeIdentityStore();
    store.privilegedMfaRequired = true;
    const guard = new BearerAuthGuard(gateway, store, {
      ...apiConfiguration,
      privilegedMfaMode: 'observe',
    });
    const request: RequestContext = {
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
      requestId: 'mfa-observe-test',
    };

    assert.equal(await guard.canActivate(createContext(request)), true);
    assert.equal(request.authenticatedUser?.assuranceLevel, 'aal1');
  });

  it('rejects a privileged AAL1 request only when enforcement is explicitly enabled', async () => {
    const gateway = new FakeAuthenticationGateway();
    const store = new FakeIdentityStore();
    store.privilegedMfaRequired = true;
    const guard = new BearerAuthGuard(gateway, store, {
      ...apiConfiguration,
      privilegedMfaMode: 'enforce',
    });
    const request: RequestContext = {
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
    };

    await assert.rejects(
      guard.canActivate(createContext(request)),
      (error: unknown) => error instanceof ApiException && error.code === 'MFA_REQUIRED',
    );
  });

  it('allows AAL2 privileged requests and ordinary citizen AAL1 requests', async () => {
    const gateway = new FakeAuthenticationGateway();
    const store = new FakeIdentityStore();
    const guard = new BearerAuthGuard(gateway, store, {
      ...apiConfiguration,
      privilegedMfaMode: 'enforce',
    });
    const request: RequestContext = {
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
    };

    store.privilegedMfaRequired = true;
    gateway.verifiedUser = { ...gateway.verifiedUser, assuranceLevel: 'aal2' };
    assert.equal(await guard.canActivate(createContext(request)), true);

    store.privilegedMfaRequired = false;
    gateway.verifiedUser = { ...gateway.verifiedUser, assuranceLevel: 'aal1' };
    assert.equal(await guard.canActivate(createContext(request)), true);
  });
});

describe('citizen phone MFA API enforcement', () => {
  it('coalesces only concurrent actor-policy reads without caching completed authorization state', async () => {
    const gateway = new FakeAuthenticationGateway();
    const store = new FakeIdentityStore();
    let releaseProfile!: () => void;
    const profileGate = new Promise<void>((resolve) => {
      releaseProfile = resolve;
    });
    let profileCalls = 0;
    let privilegedMfaCalls = 0;
    let phoneMfaCalls = 0;
    store.findProfile = async () => {
      profileCalls += 1;
      await profileGate;
      return store.profile;
    };
    store.userRequiresPrivilegedMfa = async () => {
      privilegedMfaCalls += 1;
      return false;
    };
    store.userHasVerifiedPhoneMfa = async () => {
      phoneMfaCalls += 1;
      return true;
    };
    const guard = new BearerAuthGuard(gateway, store, apiConfiguration);
    const createRequest = (): RequestContext => ({
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
    });

    const first = guard.canActivate(createContext(createRequest()));
    const second = guard.canActivate(createContext(createRequest()));
    await new Promise<void>((resolve) => setImmediate(resolve));

    assert.equal(profileCalls, 1);
    assert.equal(privilegedMfaCalls, 1);
    assert.equal(phoneMfaCalls, 0);

    releaseProfile();
    assert.deepEqual(await Promise.all([first, second]), [true, true]);
    assert.equal(phoneMfaCalls, 1);

    await guard.canActivate(createContext(createRequest()));
    assert.equal(profileCalls, 2);
    assert.equal(privilegedMfaCalls, 2);
    assert.equal(phoneMfaCalls, 2);
  });

  it('observes an unverified citizen without locking out existing accounts', async () => {
    const gateway = new FakeAuthenticationGateway();
    const store = new FakeIdentityStore();
    store.verifiedPhoneMfa = false;
    const guard = new BearerAuthGuard(gateway, store, {
      ...apiConfiguration,
      citizenPhoneMfaMode: 'observe',
    });

    assert.equal(
      await guard.canActivate(
        createContext({ headers: { authorization: 'Bearer valid-token' }, method: 'GET' }),
      ),
      true,
    );
  });

  it('requires both a verified phone factor and an AAL2 session when enforcement is enabled', async () => {
    const gateway = new FakeAuthenticationGateway();
    const store = new FakeIdentityStore();
    const guard = new BearerAuthGuard(gateway, store, {
      ...apiConfiguration,
      citizenPhoneMfaMode: 'enforce',
    });
    const request = (): RequestContext => ({
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
    });

    store.verifiedPhoneMfa = false;
    gateway.verifiedUser = { ...gateway.verifiedUser, assuranceLevel: 'aal2' };
    await assert.rejects(
      guard.canActivate(createContext(request())),
      (error: unknown) => error instanceof ApiException && error.code === 'PHONE_MFA_REQUIRED',
    );

    store.verifiedPhoneMfa = true;
    gateway.verifiedUser = { ...gateway.verifiedUser, assuranceLevel: 'aal1' };
    await assert.rejects(
      guard.canActivate(createContext(request())),
      (error: unknown) => error instanceof ApiException && error.code === 'PHONE_MFA_REQUIRED',
    );

    gateway.verifiedUser = { ...gateway.verifiedUser, assuranceLevel: 'aal2' };
    assert.equal(await guard.canActivate(createContext(request())), true);
  });

  it('keeps government and privileged accounts on their separate MFA policy', async () => {
    const gateway = new FakeAuthenticationGateway();
    const store = new FakeIdentityStore();
    store.privilegedMfaRequired = true;
    store.verifiedPhoneMfa = false;
    gateway.verifiedUser = { ...gateway.verifiedUser, assuranceLevel: 'aal2' };
    const guard = new BearerAuthGuard(gateway, store, {
      ...apiConfiguration,
      citizenPhoneMfaMode: 'enforce',
      privilegedMfaMode: 'enforce',
    });

    assert.equal(
      await guard.canActivate(
        createContext({ headers: { authorization: 'Bearer valid-token' }, method: 'GET' }),
      ),
      true,
    );
  });
});

describe('Supabase assurance-level verification', () => {
  const user = {
    email: 'operator@example.test',
    id: '7cd50865-9ebd-4a79-abaa-f059a1632985',
    phone: null,
  };

  it('builds the authenticated user only from locally verified Supabase claims', async () => {
    let getUserCalled = false;
    const clients = {
      publicClient: {
        auth: {
          getClaims: async () => ({
            data: {
              claims: {
                aal: 'aal2',
                aud: 'authenticated',
                email: user.email,
                phone: null,
                role: 'authenticated',
                sub: user.id,
              },
            },
            error: null,
          }),
          getUser: async () => {
            getUserCalled = true;
            return { data: { user }, error: null };
          },
        },
      },
    } as unknown as SupabaseClients;
    const gateway = new SupabaseAuthenticationGateway(clients);

    assert.deepEqual(await gateway.verifyAccessToken('verified-token'), {
      assuranceLevel: 'aal2',
      email: user.email,
      id: user.id,
      phone: null,
    });
    assert.equal(getUserCalled, false);
  });

  it('rejects malformed or non-user claims and fails closed when verification is unavailable', async () => {
    const invalidClaimsGateway = new SupabaseAuthenticationGateway({
      publicClient: {
        auth: {
          getClaims: async () => ({
            data: {
              claims: {
                aal: 'aal2',
                aud: 'authenticated',
                role: 'service_role',
                sub: user.id,
              },
            },
            error: null,
          }),
        },
      },
    } as unknown as SupabaseClients);
    assert.equal(await invalidClaimsGateway.verifyAccessToken('invalid-claims-token'), null);

    const unavailableGateway = new SupabaseAuthenticationGateway({
      publicClient: {
        auth: {
          getClaims: async () => ({
            data: null,
            error: { status: 500 },
          }),
        },
      },
    } as unknown as SupabaseClients);
    await assert.rejects(
      unavailableGateway.verifyAccessToken('provider-failure'),
      AuthenticationProviderUnavailableError,
    );
  });
});
