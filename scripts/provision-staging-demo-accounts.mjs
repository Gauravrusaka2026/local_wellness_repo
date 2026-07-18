#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), '..');
const localArtifactDirectory = resolve(repositoryRoot, '.local');
const projectRefPattern = /^[a-z0-9]{20}$/u;
const syntheticEmailDomain = 'localwellness.test';
const stagingDemoAccountAppMetadata = Object.freeze({
  local_wellness_demo_account: true,
  local_wellness_demo_environment: 'staging',
  local_wellness_demo_version: 1,
});

export const stagingDemoAccessMatrix = [
  {
    displayName: 'BMC demo municipal administrator',
    emailLocalPart: 'bmc-municipal-admin.demo',
    roleCode: 'municipal_admin',
    scopeCode: null,
    scopeType: 'authority',
  },
  {
    displayName: 'BMC demo government operator',
    emailLocalPart: 'bmc-operator.demo',
    roleCode: 'government_operator',
    scopeCode: null,
    scopeType: 'authority',
  },
  {
    displayName: 'BMC demo A Ward officer',
    emailLocalPart: 'bmc-ward-a.demo',
    roleCode: 'ward_officer',
    scopeCode: 'BMC-A',
    scopeType: 'ward',
  },
  {
    displayName: 'BMC demo K West Ward officer',
    emailLocalPart: 'bmc-ward-k-west.demo',
    roleCode: 'ward_officer',
    scopeCode: 'BMC-K-W',
    scopeType: 'ward',
  },
  {
    displayName: 'BMC demo Solid Waste Management officer',
    emailLocalPart: 'bmc-solid-waste.demo',
    roleCode: 'department_officer',
    scopeCode: 'bmc_swm',
    scopeType: 'department',
  },
  {
    displayName: 'BMC demo Public Health officer',
    emailLocalPart: 'bmc-public-health.demo',
    roleCode: 'department_officer',
    scopeCode: 'bmc_public_health',
    scopeType: 'department',
  },
];

export function parseStagingDemoArguments(arguments_) {
  const options = {
    acknowledgeStaging: false,
    authorityName: null,
    expiresInDays: 30,
    projectRef: null,
    rotateExistingPasswords: false,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === '--') {
      continue;
    }

    if (argument === '--acknowledge-staging') {
      options.acknowledgeStaging = true;
      continue;
    }

    if (argument === '--rotate-existing-passwords') {
      options.rotateExistingPasswords = true;
      continue;
    }

    const nextValue = arguments_[index + 1];
    if (argument === '--project-ref' && nextValue) {
      options.projectRef = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--authority-name' && nextValue) {
      options.authorityName = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--expires-in-days' && nextValue) {
      options.expiresInDays = Number(nextValue);
      index += 1;
      continue;
    }

    throw new Error(`Unsupported or incomplete argument: ${argument ?? '<missing>'}`);
  }

  if (!options.acknowledgeStaging) {
    throw new Error(
      'Pass --acknowledge-staging after confirming this is a non-production project.',
    );
  }

  if (!options.projectRef || !projectRefPattern.test(options.projectRef)) {
    throw new Error('Pass the exact 20-character hosted Supabase project ref with --project-ref.');
  }

  if (!options.authorityName) {
    throw new Error('Pass the exact reviewed authority name with --authority-name.');
  }

  if (
    !Number.isInteger(options.expiresInDays) ||
    options.expiresInDays < 1 ||
    options.expiresInDays > 90
  ) {
    throw new Error('--expires-in-days must be an integer from 1 through 90.');
  }

  return options;
}

export function assertStagingProjectUrl(supabaseUrl, projectRef) {
  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error('SUPABASE_URL must be a valid hosted Supabase URL.');
  }

  const expectedHostname = `${projectRef}.supabase.co`;
  const isExactHostedProjectRoot =
    parsedUrl.protocol === 'https:' &&
    parsedUrl.hostname === expectedHostname &&
    parsedUrl.username === '' &&
    parsedUrl.password === '' &&
    parsedUrl.port === '' &&
    parsedUrl.pathname === '/' &&
    parsedUrl.search === '' &&
    parsedUrl.hash === '';
  if (!isExactHostedProjectRoot) {
    throw new Error(
      `The configured Supabase URL does not match the acknowledged project ref ${projectRef}.`,
    );
  }

  return expectedHostname;
}

export function generateStagingPassword() {
  return `Aa1!${randomBytes(24).toString('base64url')}`;
}

export function firstConfiguredEnvironmentValue(...values) {
  return values.map((value) => value?.trim()).find(Boolean);
}

export function isManagedStagingDemoUser(user) {
  return (
    user?.app_metadata?.local_wellness_demo_account === true &&
    user.app_metadata.local_wellness_demo_environment === 'staging' &&
    user.app_metadata.local_wellness_demo_version === 1
  );
}

export function timestampsRepresentSameInstant(first, second) {
  if (typeof first !== 'string' || typeof second !== 'string') return false;
  const firstMilliseconds = Date.parse(first);
  const secondMilliseconds = Date.parse(second);
  return (
    Number.isFinite(firstMilliseconds) &&
    Number.isFinite(secondMilliseconds) &&
    firstMilliseconds === secondMilliseconds
  );
}

const isCurrent = (record, at) =>
  record.status === 'active' &&
  Date.parse(record.effective_from) <= at &&
  (record.effective_until === null || Date.parse(record.effective_until) > at);

const listAllAuthUsers = async (supabase) => {
  const users = [];
  const perPage = 1_000;

  for (let page = 1; ; page += 1) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });
    if (result.error) throw result.error;
    users.push(...result.data.users);
    if (result.data.users.length < perPage) return users;
  }
};

const requireSingle = (items, predicate, label) => {
  const matches = items.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one reviewed ${label}; found ${matches.length}.`);
  }
  return matches[0];
};

const ensureAuthUser = async ({
  account,
  existingUsersByEmail,
  expiresAt,
  password,
  rotateExistingPasswords,
  supabase,
}) => {
  const email = `${account.emailLocalPart}@${syntheticEmailDomain}`;
  const existingUser = existingUsersByEmail.get(email);
  const userMetadata = {
    demo_expires_at: expiresAt,
    display_name: account.displayName,
  };

  if (existingUser) {
    if (!rotateExistingPasswords) {
      throw new Error(
        `Synthetic account ${email} already exists. Rerun with --rotate-existing-passwords only if rotation is intended.`,
      );
    }
    if (!isManagedStagingDemoUser(existingUser)) {
      throw new Error(
        `Refusing to rotate ${email} because it is not marked as an operator-managed staging demo account.`,
      );
    }

    const result = await supabase.auth.admin.updateUserById(existingUser.id, {
      app_metadata: { ...existingUser.app_metadata, ...stagingDemoAccountAppMetadata },
      email_confirm: true,
      password,
      user_metadata: { ...existingUser.user_metadata, ...userMetadata },
    });
    if (result.error || !result.data.user) {
      throw result.error ?? new Error(`Unable to update synthetic account ${email}.`);
    }
    return { created: false, email, user: result.data.user };
  }

  const result = await supabase.auth.admin.createUser({
    app_metadata: stagingDemoAccountAppMetadata,
    email,
    email_confirm: true,
    password,
    user_metadata: userMetadata,
  });
  if (result.error || !result.data.user) {
    throw result.error ?? new Error(`Unable to create synthetic account ${email}.`);
  }
  existingUsersByEmail.set(email, result.data.user);
  return { created: true, email, user: result.data.user };
};

const requireActiveProfile = async (supabase, userId, email) => {
  const result = await supabase
    .from('profiles')
    .select('id,email,status')
    .eq('id', userId)
    .maybeSingle();

  if (result.error || result.data?.status !== 'active' || result.data.email !== email) {
    throw new Error(`Synthetic Auth identity ${email} does not have its expected active profile.`);
  }
};

const assertNoConflictingPlatformAdministrator = async ({
  expectedUserId,
  platformRoleId,
  supabase,
}) => {
  const result = await supabase
    .from('user_roles')
    .select('user_id,status,effective_from,effective_until')
    .eq('role_id', platformRoleId)
    .eq('scope_type', 'global');
  if (result.error) throw result.error;

  const now = Date.now();
  if (
    result.data.some(
      (assignment) => isCurrent(assignment, now) && assignment.user_id !== (expectedUserId ?? null),
    )
  ) {
    throw new Error('A different active platform administrator already exists in this project.');
  }
};

const ensurePlatformAdministrator = async ({
  expiresAt,
  platformAdministrator,
  platformRoleId,
  supabase,
}) => {
  const now = Date.now();
  const result = await supabase
    .from('user_roles')
    .select('id,user_id,status,effective_from,effective_until')
    .eq('role_id', platformRoleId)
    .eq('scope_type', 'global');
  if (result.error) throw result.error;

  const activeAssignments = result.data.filter((assignment) => isCurrent(assignment, now));
  if (
    activeAssignments.some((assignment) => assignment.user_id !== platformAdministrator.user.id)
  ) {
    throw new Error('A different active platform administrator already exists in this project.');
  }

  let assignment = activeAssignments.find(
    (candidate) => candidate.user_id === platformAdministrator.user.id,
  );
  if (!assignment) {
    const bootstrapResult = await supabase.rpc('bootstrap_platform_administrator', {
      target_user_id: platformAdministrator.user.id,
    });
    if (bootstrapResult.error || typeof bootstrapResult.data !== 'string') {
      throw (
        bootstrapResult.error ?? new Error('Platform administrator bootstrap did not complete.')
      );
    }
    assignment = {
      effective_from: new Date().toISOString(),
      effective_until: null,
      id: bootstrapResult.data,
      status: 'active',
      user_id: platformAdministrator.user.id,
    };
  }

  const expiryResult = await supabase
    .from('user_roles')
    .update({ effective_until: expiresAt })
    .eq('id', assignment.id)
    .select('id,user_id,status,effective_from,effective_until')
    .single();
  if (
    expiryResult.error ||
    !timestampsRepresentSameInstant(expiryResult.data?.effective_until, expiresAt)
  ) {
    throw expiryResult.error ?? new Error('Platform administrator expiry was not persisted.');
  }
  return expiryResult.data;
};

const ensureGovernmentAccess = async ({
  account,
  actorUserId,
  authority,
  expiresAt,
  invitationOptions,
  roleId,
  supabase,
  user,
}) => {
  const scope =
    account.scopeType === 'authority'
      ? authority
      : requireSingle(
          account.scopeType === 'ward' ? invitationOptions.wards : invitationOptions.departments,
          (candidate) =>
            candidate.authorityId === authority.id && candidate.code === account.scopeCode,
          `${account.scopeType} scope ${account.scopeCode}`,
        );
  const now = Date.now();
  const [membershipResult, assignmentResult] = await Promise.all([
    supabase
      .from('authority_memberships')
      .select('id,user_id,authority_id,status,effective_from,effective_until')
      .eq('user_id', user.user.id)
      .eq('authority_id', authority.id),
    supabase
      .from('user_roles')
      .select(
        'id,user_id,role_id,authority_id,scope_type,scope_id,status,effective_from,effective_until',
      )
      .eq('user_id', user.user.id)
      .eq('role_id', roleId)
      .eq('authority_id', authority.id)
      .eq('scope_type', account.scopeType)
      .eq('scope_id', scope.id),
  ]);
  if (membershipResult.error) throw membershipResult.error;
  if (assignmentResult.error) throw assignmentResult.error;

  const activeMembership = membershipResult.data.find((record) => isCurrent(record, now));
  const activeAssignment = assignmentResult.data.find((record) => isCurrent(record, now));
  if (activeMembership && activeAssignment) {
    const [membershipUpdate, assignmentUpdate] = await Promise.all([
      supabase
        .from('authority_memberships')
        .update({ effective_until: expiresAt })
        .eq('id', activeMembership.id)
        .select('id,effective_until')
        .single(),
      supabase
        .from('user_roles')
        .update({ effective_until: expiresAt })
        .eq('id', activeAssignment.id)
        .select('id,effective_until')
        .single(),
    ]);
    if (
      membershipUpdate.error ||
      !timestampsRepresentSameInstant(membershipUpdate.data?.effective_until, expiresAt)
    ) {
      throw membershipUpdate.error ?? new Error('Government membership expiry was not persisted.');
    }
    if (
      assignmentUpdate.error ||
      !timestampsRepresentSameInstant(assignmentUpdate.data?.effective_until, expiresAt)
    ) {
      throw assignmentUpdate.error ?? new Error('Government role expiry was not persisted.');
    }
    return { membershipId: activeMembership.id, roleAssignmentId: activeAssignment.id, scope };
  }

  if (activeMembership || activeAssignment) {
    throw new Error(
      `Synthetic access for ${user.email} is partially provisioned and needs review.`,
    );
  }

  const provisionResult = await supabase.rpc('provision_government_invitation', {
    actor_user_id: actorUserId,
    authority_id: authority.id,
    effective_from: new Date().toISOString(),
    effective_until: expiresAt,
    invitation_email: user.email,
    invited_user_id: user.user.id,
    role_id: roleId,
    scope_id: scope.id,
    scope_type: account.scopeType,
  });
  const provisioned = provisionResult.data?.[0];
  if (provisionResult.error || !provisioned) {
    throw provisionResult.error ?? new Error(`Unable to provision access for ${user.email}.`);
  }
  return {
    membershipId: provisioned.membership_id,
    roleAssignmentId: provisioned.role_assignment_id,
    scope,
  };
};

const verifyPasswordAuthentication = async ({ anonKey, email, password, supabaseUrl }) => {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session?.access_token) {
    throw result.error ?? new Error(`Password verification failed for ${email}.`);
  }
  await client.auth.signOut({ scope: 'local' });
};

const writeCredentialArtifact = async ({ accounts, authority, expiresAt, projectRef }) => {
  await mkdir(localArtifactDirectory, { recursive: true, mode: 0o700 });
  const outputPath = resolve(localArtifactDirectory, `staging-demo-accounts.${projectRef}.json`);
  const payload = {
    accounts,
    authority: { code: authority.code, id: authority.id, name: authority.name },
    environment: 'staging',
    expiresAt,
    generatedAt: new Date().toISOString(),
    projectRef,
    warning:
      'Synthetic non-production credentials. Keep local, enroll a separate TOTP per account used, and revoke after testing.',
  };
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await chmod(outputPath, 0o600);
  return outputPath;
};

export async function provisionStagingDemoAccounts({ arguments_ = process.argv.slice(2) } = {}) {
  const options = parseStagingDemoArguments(arguments_);
  const supabaseUrl = process.env['SUPABASE_URL']?.trim();
  const serviceKey = firstConfiguredEnvironmentValue(
    process.env['SUPABASE_SECRET_KEY'],
    process.env['SUPABASE_SERVICE_ROLE_KEY'],
  );
  const anonKey = firstConfiguredEnvironmentValue(
    process.env['SUPABASE_PUBLISHABLE_KEY'],
    process.env['SUPABASE_ANON_KEY'],
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  );
  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error(
      'SUPABASE_URL, a server secret/service-role key, and a public publishable/anon key are required.',
    );
  }
  const projectHost = assertStagingProjectUrl(supabaseUrl, options.projectRef);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const expiresAt = new Date(Date.now() + options.expiresInDays * 86_400_000).toISOString();
  const [authUsers, invitationOptionsResult, rolesResult] = await Promise.all([
    listAllAuthUsers(supabase),
    supabase.rpc('list_government_invitation_options'),
    supabase.from('roles').select('id,code'),
  ]);
  if (invitationOptionsResult.error || !invitationOptionsResult.data) {
    throw (
      invitationOptionsResult.error ?? new Error('Government invitation options are unavailable.')
    );
  }
  if (rolesResult.error) throw rolesResult.error;
  const invitationOptions = invitationOptionsResult.data;
  const authority = requireSingle(
    invitationOptions.authorities,
    (candidate) => candidate.name === options.authorityName,
    `authority named ${options.authorityName}`,
  );
  const roleIdByCode = new Map(rolesResult.data.map((role) => [role.code, role.id]));
  const platformRoleId = roleIdByCode.get('platform_admin');
  if (!platformRoleId) throw new Error('The platform administrator role is unavailable.');
  const existingUsersByEmail = new Map(
    authUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]),
  );

  const platformAccount = {
    displayName: 'Local Wellness staging platform administrator',
    emailLocalPart: 'platform-admin.demo',
  };
  const platformEmail = `${platformAccount.emailLocalPart}@${syntheticEmailDomain}`;
  await assertNoConflictingPlatformAdministrator({
    expectedUserId: existingUsersByEmail.get(platformEmail)?.id,
    platformRoleId,
    supabase,
  });
  const platformPassword = generateStagingPassword();
  const platformAdministrator = await ensureAuthUser({
    account: platformAccount,
    existingUsersByEmail,
    expiresAt,
    password: platformPassword,
    rotateExistingPasswords: options.rotateExistingPasswords,
    supabase,
  });
  await requireActiveProfile(supabase, platformAdministrator.user.id, platformAdministrator.email);
  const platformAssignment = await ensurePlatformAdministrator({
    expiresAt,
    platformAdministrator,
    platformRoleId,
    supabase,
  });

  const credentialAccounts = [
    {
      email: platformAdministrator.email,
      password: platformPassword,
      roleCode: 'platform_admin',
      scopeCode: 'global',
      scopeName: 'Global platform',
      userId: platformAdministrator.user.id,
      roleAssignmentId: platformAssignment.id,
    },
  ];

  for (const account of stagingDemoAccessMatrix) {
    const roleId = roleIdByCode.get(account.roleCode);
    if (!roleId) throw new Error(`Required role ${account.roleCode} is unavailable.`);
    const password = generateStagingPassword();
    const user = await ensureAuthUser({
      account,
      existingUsersByEmail,
      expiresAt,
      password,
      rotateExistingPasswords: options.rotateExistingPasswords,
      supabase,
    });
    await requireActiveProfile(supabase, user.user.id, user.email);
    const access = await ensureGovernmentAccess({
      account,
      actorUserId: platformAdministrator.user.id,
      authority,
      expiresAt,
      invitationOptions,
      roleId,
      supabase,
      user,
    });
    credentialAccounts.push({
      email: user.email,
      membershipId: access.membershipId,
      password,
      roleAssignmentId: access.roleAssignmentId,
      roleCode: account.roleCode,
      scopeCode: access.scope.code,
      scopeName: access.scope.name,
      userId: user.user.id,
    });
  }

  for (const account of credentialAccounts) {
    await verifyPasswordAuthentication({
      anonKey,
      email: account.email,
      password: account.password,
      supabaseUrl,
    });
  }

  const outputPath = await writeCredentialArtifact({
    accounts: credentialAccounts,
    authority,
    expiresAt,
    projectRef: options.projectRef,
  });
  process.stdout.write(
    [
      `Provisioned and password-verified ${credentialAccounts.length} synthetic staging accounts on ${projectHost}.`,
      `All privileged assignments expire at ${expiresAt}.`,
      `Credentials were written with mode 0600 to ${outputPath}.`,
      'No password, service key, or authenticator secret was printed.',
    ].join('\n') + '\n',
  );
  return { accounts: credentialAccounts.length, expiresAt, outputPath };
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  provisionStagingDemoAccounts().catch((error) => {
    process.stderr.write(
      `Staging demo account provisioning failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
