import assert from 'node:assert/strict';
import test from 'node:test';

import { createClient } from '@supabase/supabase-js';

const firstEnvironmentValue = (...names) =>
  names.map((name) => process.env[name]?.trim()).find(Boolean);
const supabaseUrl = firstEnvironmentValue('API_URL', 'LOCAL_SUPABASE_URL', 'SUPABASE_URL');
const anonKey = firstEnvironmentValue(
  'PUBLISHABLE_KEY',
  'LOCAL_SUPABASE_PUBLISHABLE_KEY',
  'ANON_KEY',
  'LOCAL_SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
);
const serviceRoleKey = firstEnvironmentValue(
  'SECRET_KEY',
  'LOCAL_SUPABASE_SECRET_KEY',
  'SERVICE_ROLE_KEY',
  'LOCAL_SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
);
const hasLocalConfiguration = Boolean(supabaseUrl && anonKey && serviceRoleKey);
const requiresLocalConfiguration = process.env['REQUIRE_LOCAL_SUPABASE'] === 'true';
const seededMaharashtraStateAuthorityId = '984805ee-52b9-5be0-bed2-3951cc6cab2d';

if (requiresLocalConfiguration && !hasLocalConfiguration) {
  throw new Error(
    'REQUIRE_LOCAL_SUPABASE=true, but the local API URL, public key, or server secret key is missing.',
  );
}

if (requiresLocalConfiguration && supabaseUrl) {
  let hostname;

  try {
    hostname = new URL(supabaseUrl).hostname;
  } catch {
    throw new Error('REQUIRE_LOCAL_SUPABASE=true, but the Supabase API URL is invalid.');
  }

  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

  if (!loopbackHosts.has(hostname)) {
    throw new Error(
      `REQUIRE_LOCAL_SUPABASE=true refuses the non-loopback Supabase host ${hostname}.`,
    );
  }
}
const localMailUrl =
  firstEnvironmentValue('MAILPIT_URL', 'INBUCKET_URL', 'LOCAL_SUPABASE_MAIL_URL') ??
  'http://127.0.0.1:54324';

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};

const createLocalClients = () => ({
  adminClient: createClient(supabaseUrl, serviceRoleKey, clientOptions),
  publicClient: createClient(supabaseUrl, anonKey, clientOptions),
});

const fetchJsonIfAvailable = async (url) => {
  let response;

  try {
    response = await fetch(url);
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return response.json();
};

const getInbucketMessage = async (email) => {
  const mailbox = email.slice(0, email.indexOf('@'));
  const messages = await fetchJsonIfAvailable(
    `${localMailUrl}/api/v1/mailbox/${encodeURIComponent(mailbox)}`,
  );

  if (!Array.isArray(messages)) {
    return null;
  }

  for (const message of messages) {
    if (typeof message?.id !== 'string') {
      continue;
    }

    const detail = await fetchJsonIfAvailable(
      `${localMailUrl}/api/v1/mailbox/${encodeURIComponent(mailbox)}/${encodeURIComponent(message.id)}`,
    );
    const html = detail?.body?.html;

    if (typeof html === 'string') {
      return { html, subject: detail?.subject ?? message.subject ?? null };
    }
  }

  return null;
};

const getMailpitMessage = async (email) => {
  const listing = await fetchJsonIfAvailable(`${localMailUrl}/api/v1/messages`);
  const messages = Array.isArray(listing?.messages) ? listing.messages : [];

  for (const message of messages) {
    const recipients = Array.isArray(message?.To) ? message.To : [];
    const isRecipient = recipients.some((recipient) => recipient?.Address === email);

    if (!isRecipient || typeof message?.ID !== 'string') {
      continue;
    }

    const detail = await fetchJsonIfAvailable(
      `${localMailUrl}/api/v1/message/${encodeURIComponent(message.ID)}`,
    );

    if (typeof detail?.HTML === 'string') {
      return { html: detail.HTML, subject: detail.Subject ?? message.Subject ?? null };
    }
  }

  return null;
};

const waitForEmailMessage = async (email) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const message = (await getInbucketMessage(email)) ?? (await getMailpitMessage(email));

    if (message) {
      return message;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('The local authentication email was not delivered.');
};

const getEmailOtp = (html) => {
  const token = html.match(/\b(\d{6})\b/)?.[1];

  if (!token) {
    throw new Error('The local authentication email did not contain a 6-digit code.');
  }

  return token;
};

const getInvitationUrl = (html) => {
  const href = html.match(/href=["']([^"']+)["']/i)?.[1];

  if (!href) {
    throw new Error('The local invitation email did not contain an invitation link.');
  }

  return new URL(href.replaceAll('&amp;', '&'));
};

const normalizeProviderPhone = (phone) => {
  assert.equal(typeof phone, 'string');
  const digits = phone.startsWith('+') ? phone.slice(1) : phone;
  assert.match(digits, /^[1-9]\d{7,14}$/u);

  return `+${digits}`;
};

test(
  'local Supabase sends a code-only citizen email and verifies its OTP',
  { skip: hasLocalConfiguration ? false : 'Local Supabase environment is not running.' },
  async () => {
    const { adminClient, publicClient } = createLocalClients();
    let createdUserId;

    try {
      const email = `phase1-${Date.now()}@localwellness.test`;
      const redirectTo = 'http://localhost:3000/auth/callback';
      const { error: requestEmailOtpError } = await publicClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      assert.equal(requestEmailOtpError, null);

      const authenticationMessage = await waitForEmailMessage(email);
      assert.equal(authenticationMessage.subject, 'Your Local Wellness verification code');
      assert.doesNotMatch(authenticationMessage.html, /href\s*=|https?:\/\//i);
      const token = getEmailOtp(authenticationMessage.html);

      const { data: emailVerification, error: emailVerificationError } =
        await publicClient.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });
      assert.equal(emailVerificationError, null);
      assert.ok(emailVerification.session?.access_token);
      assert.ok(emailVerification.user?.id);
      createdUserId = emailVerification.user.id;

      const { data: emailProfile, error: emailProfileError } = await publicClient
        .from('profiles')
        .select('id,email,status')
        .eq('id', emailVerification.user.id)
        .single();
      assert.equal(emailProfileError, null);
      assert.equal(emailProfile.email, email);
      assert.equal(emailProfile.status, 'active');
    } finally {
      if (createdUserId) {
        const { error } = await adminClient.auth.admin.deleteUser(createdUserId);
        assert.equal(error, null);
      }
    }
  },
);

test(
  'local Supabase links and confirms a citizen phone without Advanced Phone MFA',
  { skip: hasLocalConfiguration ? false : 'Local Supabase environment is not running.' },
  async () => {
    const { adminClient, publicClient } = createLocalClients();
    let createdUserId;

    try {
      const email = `phone-confirmation-${Date.now()}@localwellness.test`;
      const password = 'initial secure password';
      const phone = '+12025550123';
      const { data: signUp, error: signUpError } = await publicClient.auth.signUp({
        email,
        password,
      });
      assert.equal(signUpError, null);
      assert.ok(signUp.session?.access_token);
      assert.ok(signUp.user?.id);
      createdUserId = signUp.user.id;

      const { data: phoneChange, error: phoneChangeError } = await publicClient.auth.updateUser({
        phone,
      });
      assert.equal(phoneChangeError, null);
      assert.equal(phoneChange.user.id, createdUserId);

      const { data: phoneVerification, error: phoneVerificationError } =
        await publicClient.auth.verifyOtp({ phone, token: '123456', type: 'phone_change' });
      assert.equal(phoneVerificationError, null);
      assert.equal(phoneVerification.user?.id, createdUserId);
      assert.equal(normalizeProviderPhone(phoneVerification.user?.phone), phone);
      assert.ok(phoneVerification.user?.phone_confirmed_at);

      const { data: hasVerifiedPhone, error: verifiedPhoneError } = await adminClient.rpc(
        'user_has_verified_phone',
        { p_user_id: createdUserId },
      );
      assert.equal(verifiedPhoneError, null);
      assert.equal(hasVerifiedPhone, true);
    } finally {
      if (createdUserId) {
        const { error } = await adminClient.auth.admin.deleteUser(createdUserId);
        assert.equal(error, null);
      }
    }
  },
);

test(
  'local Supabase authorizes a password update with an existing-phone SMS session',
  { skip: hasLocalConfiguration ? false : 'Local Supabase environment is not running.' },
  async () => {
    const { adminClient } = createLocalClients();
    const passwordClient = createClient(supabaseUrl, anonKey, clientOptions);
    const signInClient = createClient(supabaseUrl, anonKey, clientOptions);
    let createdUserId;

    try {
      const email = `phone-password-${Date.now()}@localwellness.test`;
      const oldPassword = 'initial secure password';
      const newPassword = 'updated secure password';
      const phone = '+12025550124';
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        password: oldPassword,
        phone,
        phone_confirm: true,
      });
      assert.equal(createError, null);
      assert.ok(created.user?.id);
      createdUserId = created.user.id;

      const { error: requestError } = await passwordClient.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false },
      });
      assert.equal(requestError, null);

      const { data: verified, error: verifyError } = await passwordClient.auth.verifyOtp({
        phone,
        token: '654321',
        type: 'sms',
      });
      assert.equal(verifyError, null);
      assert.equal(verified.user?.id, createdUserId);
      assert.equal(normalizeProviderPhone(verified.user?.phone), phone);
      assert.ok(verified.session?.access_token);

      const { data: updated, error: updateError } = await passwordClient.auth.updateUser({
        password: newPassword,
      });
      assert.equal(updateError, null);
      assert.equal(updated.user.id, createdUserId);

      const { data: newPasswordSignIn, error: newPasswordSignInError } =
        await signInClient.auth.signInWithPassword({ email, password: newPassword });
      assert.equal(newPasswordSignInError, null);
      assert.equal(newPasswordSignIn.user?.id, createdUserId);

      const stalePasswordClient = createClient(supabaseUrl, anonKey, clientOptions);
      const { error: oldPasswordSignInError } = await stalePasswordClient.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      assert.ok(oldPasswordSignInError);
    } finally {
      if (createdUserId) {
        const { error } = await adminClient.auth.admin.deleteUser(createdUserId);
        assert.equal(error, null);
      }
    }
  },
);

test(
  'local Supabase rejects phone-only account creation while Phone Auth remains enabled',
  { skip: hasLocalConfiguration ? false : 'Local Supabase environment is not running.' },
  async () => {
    const { adminClient, publicClient } = createLocalClients();
    const phone = '+12025550125';
    let createdUserId;

    try {
      const { data, error } = await publicClient.auth.signUp({
        phone,
        password: 'phone-only accounts are not allowed',
      });
      createdUserId = data.user?.id;

      assert.ok(error);
      assert.match(error.message, /email address/i);
      assert.equal(data.user, null);
      assert.equal(data.session, null);
    } finally {
      if (createdUserId) {
        const { error } = await adminClient.auth.admin.deleteUser(createdUserId);
        assert.equal(error, null);
      }
    }
  },
);

test(
  'local Supabase invitation provisions readable government access for the invited session',
  { skip: hasLocalConfiguration ? false : 'Local Supabase environment is not running.' },
  async () => {
    const { adminClient, publicClient } = createLocalClients();
    const actorEmail = `phase1-platform-admin-${Date.now()}@localwellness.test`;
    const email = `phase1-invite-${Date.now()}@localwellness.test`;
    const redirectTo = 'http://localhost:3003/auth/callback';
    const authorityId = seededMaharashtraStateAuthorityId;
    let actorUserId;
    let invitedUserId;

    try {
      const { data: actor, error: actorError } = await adminClient.auth.admin.createUser({
        email: actorEmail,
        email_confirm: true,
      });
      assert.equal(actorError, null);
      assert.ok(actor.user?.id);
      actorUserId = actor.user.id;

      const { data: bootstrapAssignmentId, error: bootstrapError } = await adminClient.rpc(
        'bootstrap_platform_administrator',
        { target_user_id: actorUserId },
      );
      assert.equal(bootstrapError, null);
      assert.ok(bootstrapAssignmentId);

      const { data: invitation, error: invitationError } =
        await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo });
      assert.equal(invitationError, null);
      assert.ok(invitation.user?.id);
      invitedUserId = invitation.user.id;

      const { data: governmentOperatorRole, error: roleError } = await adminClient
        .from('roles')
        .select('id')
        .eq('code', 'government_operator')
        .single();
      assert.equal(roleError, null);
      assert.ok(governmentOperatorRole?.id);

      const effectiveFrom = new Date(Date.now() - 1_000).toISOString();
      const { data: provisionedAccess, error: provisionError } = await adminClient.rpc(
        'provision_government_invitation',
        {
          actor_user_id: actorUserId,
          authority_id: authorityId,
          effective_from: effectiveFrom,
          effective_until: null,
          invitation_email: email,
          invited_user_id: invitedUserId,
          role_id: governmentOperatorRole.id,
          scope_id: authorityId,
          scope_type: 'authority',
        },
      );
      assert.equal(provisionError, null);
      assert.ok(provisionedAccess?.[0]?.membership_id);
      assert.ok(provisionedAccess?.[0]?.role_assignment_id);

      const invitationMessage = await waitForEmailMessage(email);
      assert.equal(invitationMessage.subject, 'You are invited to Local Wellness');

      const invitationUrl = getInvitationUrl(invitationMessage.html);
      assert.equal(`${invitationUrl.origin}${invitationUrl.pathname}`, redirectTo);
      assert.equal(invitationUrl.searchParams.get('type'), 'invite');
      const tokenHash = invitationUrl.searchParams.get('token_hash');
      assert.ok(tokenHash);

      const { data: verification, error: verificationError } = await publicClient.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'invite',
      });
      assert.equal(verificationError, null);
      assert.ok(verification.session?.access_token);
      assert.equal(verification.user?.id, invitedUserId);

      const { data: invitedProfile, error: invitedProfileError } = await publicClient
        .from('profiles')
        .select('id,email,status')
        .eq('id', invitedUserId)
        .single();
      assert.equal(invitedProfileError, null);
      assert.equal(invitedProfile.id, invitedUserId);
      assert.equal(invitedProfile.email, email);
      assert.equal(invitedProfile.status, 'active');

      const { data: membership, error: membershipError } = await publicClient
        .from('authority_memberships')
        .select('id,authority_id,status,effective_from,effective_until')
        .eq('user_id', invitedUserId)
        .eq('authority_id', authorityId)
        .eq('status', 'active')
        .single();
      assert.equal(membershipError, null);
      assert.equal(membership.authority_id, authorityId);
      assert.equal(Date.parse(membership.effective_from), Date.parse(effectiveFrom));
      assert.equal(membership.effective_until, null);

      const { data: roleAssignment, error: roleAssignmentError } = await publicClient
        .from('user_roles')
        .select('id,role_id,authority_id,scope_type,scope_id,status,effective_from,effective_until')
        .eq('user_id', invitedUserId)
        .eq('role_id', governmentOperatorRole.id)
        .eq('authority_id', authorityId)
        .eq('status', 'active')
        .single();
      assert.equal(roleAssignmentError, null);
      assert.equal(roleAssignment.authority_id, authorityId);
      assert.equal(roleAssignment.scope_type, 'authority');
      assert.equal(roleAssignment.scope_id, authorityId);
      assert.equal(Date.parse(roleAssignment.effective_from), Date.parse(effectiveFrom));
      assert.equal(roleAssignment.effective_until, null);
    } finally {
      if (invitedUserId) {
        const { error: invitedUserDeletionError } =
          await adminClient.auth.admin.deleteUser(invitedUserId);
        assert.equal(invitedUserDeletionError, null);
      }

      if (actorUserId) {
        const { error: actorDeletionError } = await adminClient.auth.admin.deleteUser(actorUserId);
        assert.equal(actorDeletionError, null);
      }
    }
  },
);
