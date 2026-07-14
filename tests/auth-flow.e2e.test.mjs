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
const hasSmsProvider = process.env['LOCAL_SUPABASE_SMS_ENABLED'] === 'true';
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

const waitForInvitationMessage = async (email) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const message = (await getInbucketMessage(email)) ?? (await getMailpitMessage(email));

    if (message) {
      return message;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('The local invitation email was not delivered.');
};

const getInvitationUrl = (html) => {
  const href = html.match(/href=["']([^"']+)["']/i)?.[1];

  if (!href) {
    throw new Error('The local invitation email did not contain an invitation link.');
  }

  return new URL(href.replaceAll('&amp;', '&'));
};

test(
  'local Supabase supports a citizen email magic-link session',
  { skip: hasLocalConfiguration ? false : 'Local Supabase environment is not running.' },
  async () => {
    const { adminClient, publicClient } = createLocalClients();
    let createdUserId;

    try {
      const email = `phase1-${Date.now()}@localwellness.test`;
      const redirectTo = 'http://localhost:3000/auth/callback';
      const { error: requestEmailLinkError } = await publicClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      assert.equal(requestEmailLinkError, null);

      const { data: generatedLink, error: generatedLinkError } =
        await adminClient.auth.admin.generateLink({
          email,
          options: { redirectTo },
          type: 'magiclink',
        });
      assert.equal(generatedLinkError, null);
      assert.ok(generatedLink.properties?.hashed_token);

      const { data: emailVerification, error: emailVerificationError } =
        await publicClient.auth.verifyOtp({
          token_hash: generatedLink.properties.hashed_token,
          type: 'magiclink',
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
  'local Supabase supports a citizen phone OTP session when SMS delivery is enabled',
  {
    skip: !hasLocalConfiguration
      ? 'Local Supabase environment is not running.'
      : !hasSmsProvider
        ? 'Set LOCAL_SUPABASE_SMS_ENABLED=true after configuring a local SMS provider.'
        : false,
  },
  async () => {
    const { adminClient, publicClient } = createLocalClients();
    let createdUserId;

    try {
      const phone = '+12025550123';
      const { error: requestPhoneOtpError } = await publicClient.auth.signInWithOtp({ phone });
      assert.equal(requestPhoneOtpError, null);

      const { data: phoneVerification, error: phoneVerificationError } =
        await publicClient.auth.verifyOtp({ phone, token: '123456', type: 'sms' });
      assert.equal(phoneVerificationError, null);
      assert.ok(phoneVerification.session?.access_token);
      assert.ok(phoneVerification.user?.id);
      createdUserId = phoneVerification.user.id;

      const { data: phoneProfile, error: phoneProfileError } = await publicClient
        .from('profiles')
        .select('id,phone,status')
        .eq('id', phoneVerification.user.id)
        .single();
      assert.equal(phoneProfileError, null);
      assert.equal(phoneProfile.phone, phone);
      assert.equal(phoneProfile.status, 'active');
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

      const invitationMessage = await waitForInvitationMessage(email);
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
