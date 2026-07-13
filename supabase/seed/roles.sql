insert into public.roles (
  id,
  code,
  name,
  description,
  is_system,
  is_government,
  is_privileged
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'citizen',
    'Citizen',
    'Creates and follows civic complaints as a resident.',
    true,
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'government_operator',
    'Government operator',
    'Performs operational work within an assigned authority.',
    true,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'ward_officer',
    'Ward officer',
    'Handles work within an assigned ward and authority.',
    true,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'department_officer',
    'Department officer',
    'Handles work within an assigned department and authority.',
    true,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'municipal_admin',
    'Municipal administrator',
    'Manages identity access within an assigned municipal authority.',
    true,
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'platform_admin',
    'Platform administrator',
    'Manages restricted platform-wide administrative access.',
    true,
    false,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000007',
    'moderator',
    'Moderator',
    'Moderates content within an assigned authority.',
    true,
    true,
    true
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  is_government = excluded.is_government,
  is_privileged = excluded.is_privileged,
  updated_at = now();
