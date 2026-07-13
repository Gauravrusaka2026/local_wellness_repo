import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const targetUserId = process.argv[2];
const supabaseUrl = process.env['SUPABASE_URL']?.trim();
const serviceRoleKey = [
  process.env['SUPABASE_SECRET_KEY'],
  process.env['SUPABASE_SERVICE_ROLE_KEY'],
]
  .map((value) => value?.trim())
  .find(Boolean);

if (!targetUserId || !uuidPattern.test(targetUserId)) {
  throw new Error(
    'Usage: pnpm access:bootstrap-platform-admin -- <existing-supabase-auth-user-uuid>',
  );
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) are required in the trusted operator environment.',
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});
const { data, error } = await supabase.rpc('bootstrap_platform_administrator', {
  target_user_id: targetUserId,
});

if (error) {
  throw new Error(`Platform administrator bootstrap failed: ${error.message}`);
}

process.stdout.write(
  `Platform administrator access was bootstrapped for ${targetUserId}; assignment ${String(data)}.\n`,
);
