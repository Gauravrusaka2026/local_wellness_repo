import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadApiConfiguration } from '../configuration.js';

const baseEnvironment: NodeJS.ProcessEnv = {
  API_ALLOWED_ORIGINS: 'http://localhost:3000',
  GOVERNMENT_INVITE_REDIRECT_URL: 'http://localhost:3003/auth/callback',
  SUPABASE_URL: 'http://127.0.0.1:54321',
};

describe('API environment aliases', () => {
  it('prefers current publishable and secret keys', () => {
    const configuration = loadApiConfiguration({
      ...baseEnvironment,
      SUPABASE_ANON_KEY: 'legacy-anon',
      SUPABASE_PUBLISHABLE_KEY: 'current-publishable',
      SUPABASE_SECRET_KEY: 'current-secret',
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role',
    });

    assert.equal(configuration.supabase.anonKey, 'current-publishable');
    assert.equal(configuration.supabase.serviceRoleKey, 'current-secret');
  });

  it('uses legacy aliases when preferred variables are empty', () => {
    const configuration = loadApiConfiguration({
      ...baseEnvironment,
      SUPABASE_ANON_KEY: 'legacy-anon',
      SUPABASE_PUBLISHABLE_KEY: '',
      SUPABASE_SECRET_KEY: ' ',
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role',
    });

    assert.equal(configuration.supabase.anonKey, 'legacy-anon');
    assert.equal(configuration.supabase.serviceRoleKey, 'legacy-service-role');
  });

  it('defaults assurance controls to observe and accepts only explicit enforcement', () => {
    const defaultConfiguration = loadApiConfiguration({
      ...baseEnvironment,
      SUPABASE_PUBLISHABLE_KEY: 'publishable',
      SUPABASE_SECRET_KEY: 'secret',
    });
    const enforcedConfiguration = loadApiConfiguration({
      ...baseEnvironment,
      API_CITIZEN_PHONE_VERIFICATION_MODE: 'enforce',
      API_PRIVILEGED_MFA_MODE: 'enforce',
      SUPABASE_PUBLISHABLE_KEY: 'publishable',
      SUPABASE_SECRET_KEY: 'secret',
    });

    assert.equal(defaultConfiguration.citizenPhoneVerificationMode, 'observe');
    assert.equal(defaultConfiguration.privilegedMfaMode, 'observe');
    assert.equal(enforcedConfiguration.citizenPhoneVerificationMode, 'enforce');
    assert.equal(enforcedConfiguration.privilegedMfaMode, 'enforce');
    assert.throws(() =>
      loadApiConfiguration({
        ...baseEnvironment,
        API_PRIVILEGED_MFA_MODE: 'disabled',
        SUPABASE_PUBLISHABLE_KEY: 'publishable',
        SUPABASE_SECRET_KEY: 'secret',
      }),
    );
    assert.throws(() =>
      loadApiConfiguration({
        ...baseEnvironment,
        API_CITIZEN_PHONE_VERIFICATION_MODE: 'disabled',
        SUPABASE_PUBLISHABLE_KEY: 'publishable',
        SUPABASE_SECRET_KEY: 'secret',
      }),
    );
  });

  it('prefers the phone-verification setting and accepts the deprecated MFA fallback', () => {
    const preferred = loadApiConfiguration({
      ...baseEnvironment,
      API_CITIZEN_PHONE_MFA_MODE: 'observe',
      API_CITIZEN_PHONE_VERIFICATION_MODE: 'enforce',
      SUPABASE_PUBLISHABLE_KEY: 'publishable',
      SUPABASE_SECRET_KEY: 'secret',
    });
    const legacy = loadApiConfiguration({
      ...baseEnvironment,
      API_CITIZEN_PHONE_MFA_MODE: 'enforce',
      SUPABASE_PUBLISHABLE_KEY: 'publishable',
      SUPABASE_SECRET_KEY: 'secret',
    });

    assert.equal(preferred.citizenPhoneVerificationMode, 'enforce');
    assert.equal(legacy.citizenPhoneVerificationMode, 'enforce');
  });

  it('requires explicit citizen phone verification enforcement in production', () => {
    assert.throws(
      () =>
        loadApiConfiguration({
          ...baseEnvironment,
          NODE_ENV: 'production',
          SUPABASE_PUBLISHABLE_KEY: 'publishable',
          SUPABASE_SECRET_KEY: 'secret',
        }),
      /API_CITIZEN_PHONE_VERIFICATION_MODE must be explicitly set to enforce in production/u,
    );

    const configuration = loadApiConfiguration({
      ...baseEnvironment,
      API_CITIZEN_PHONE_VERIFICATION_MODE: 'enforce',
      NODE_ENV: 'production',
      SUPABASE_PUBLISHABLE_KEY: 'publishable',
      SUPABASE_SECRET_KEY: 'secret',
    });

    assert.equal(configuration.citizenPhoneVerificationMode, 'enforce');

    const legacyConfiguration = loadApiConfiguration({
      ...baseEnvironment,
      API_CITIZEN_PHONE_MFA_MODE: 'enforce',
      NODE_ENV: 'production',
      SUPABASE_PUBLISHABLE_KEY: 'publishable',
      SUPABASE_SECRET_KEY: 'secret',
    });

    assert.equal(legacyConfiguration.citizenPhoneVerificationMode, 'enforce');
  });
});
