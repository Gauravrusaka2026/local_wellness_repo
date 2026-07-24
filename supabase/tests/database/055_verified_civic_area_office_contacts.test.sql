begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, routing, extensions;

select plan(15);

select ok(
  to_regclass('governance.offices_verified_civic_area_scope_idx') is not null,
  'verified civic-area office lookups have a scoped partial index'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.resolve_verified_governing_bodies(double precision,double precision,double precision,timestamp with time zone)',
    'execute'
  ),
  'anonymous clients cannot call the civic-area projection directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.resolve_verified_governing_bodies(double precision,double precision,double precision,timestamp with time zone)',
    'execute'
  ),
  'authenticated clients cannot bypass the API civic-area boundary'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.resolve_verified_governing_bodies(double precision,double precision,double precision,timestamp with time zone)',
    'execute'
  ),
  'the service role can call the civic-area projection'
);
select ok(
  position(
    'ward_issue_contacts' in pg_get_functiondef(
      'public.resolve_verified_governing_bodies(double precision,double precision,double precision,timestamp with time zone)'::regprocedure
    )
  ) = 0,
  'the public-safe projection does not read the private ward issue-contact matrix'
);

insert into governance.reference_sources (
  id, title, url, source_type, last_checked_on
)
values
  (
    'ab000000-0000-4000-8000-000000000001',
    'Synthetic official civic-area fixture',
    'https://official.gov.test/civic-area-fixture',
    'official',
    date '2026-07-24'
  ),
  (
    'ab000000-0000-4000-8000-000000000002',
    'Synthetic repository-only civic-area fixture',
    'https://repository.test/civic-area-fixture',
    'repository',
    date '2026-07-24'
  );

insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'ab100000-0000-4000-8000-000000000001', null,
    'CIVIC_AREA_TEST_STATE', 'Civic Area Test State', 'state',
    'verified', true, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  ),
  (
    'ab100000-0000-4000-8000-000000000002',
    'ab100000-0000-4000-8000-000000000001',
    'CIVIC_AREA_TEST_BODY', 'Civic Area Test Authority', 'local_body',
    'verified', true, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  );

insert into governance.states (
  id, authority_id, name, iso_code, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'ab200000-0000-4000-8000-000000000001',
  'ab100000-0000-4000-8000-000000000001',
  'Civic Area Test State', 'CAT', 'verified', true, date '2026-07-24',
  'ab000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'ab300000-0000-4000-8000-000000000001',
  'ab100000-0000-4000-8000-000000000002',
  'ab200000-0000-4000-8000-000000000001',
  'Civic Area Test Municipal Corporation', 'municipal_corporation',
  'verified', true, date '2026-07-24',
  'ab000000-0000-4000-8000-000000000001'
);

insert into governance.wards (
  id, local_body_id, source_ward_code, name, ward_number,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'ab400000-0000-4000-8000-000000000001',
    'ab300000-0000-4000-8000-000000000001',
    'CIVIC-AREA-WARD-1', 'Civic Area Test Ward 1', '1',
    'verified', true, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  ),
  (
    'ab400000-0000-4000-8000-000000000002',
    'ab300000-0000-4000-8000-000000000001',
    'CIVIC-AREA-WARD-2', 'Civic Area Test Ward 2', '2',
    'verified', true, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  );

insert into governance.jurisdiction_boundary_versions (
  id, local_body_id, version, boundary, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values (
  'ab500000-0000-4000-8000-000000000001',
  'ab300000-0000-4000-8000-000000000001', 1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((73.8 18.5,73.9 18.5,73.9 18.6,73.8 18.6,73.8 18.5)))', 4326
  ),
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-24', 'ab000000-0000-4000-8000-000000000001'
);

insert into governance.jurisdiction_boundary_versions (
  id, ward_id, version, boundary, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values (
  'ab500000-0000-4000-8000-000000000002',
  'ab400000-0000-4000-8000-000000000001', 1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((73.8 18.5,73.85 18.5,73.85 18.6,73.8 18.6,73.8 18.5)))', 4326
  ),
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-24', 'ab000000-0000-4000-8000-000000000001'
);

insert into governance.offices (
  id, authority_id, local_body_id, ward_id, name, office_type,
  address, official_phone, official_email, status, verification_status,
  is_placeholder, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'ab600000-0000-4000-8000-000000000001',
    'ab100000-0000-4000-8000-000000000002',
    'ab300000-0000-4000-8000-000000000001',
    'ab400000-0000-4000-8000-000000000001',
    'Civic Area Full Ward Office', 'ward_office',
    '1 Civic Street', '12345678; 87654321', 'ward-one@official.gov.test',
    'active', 'verified', false, false, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  ),
  (
    'ab600000-0000-4000-8000-000000000002',
    'ab100000-0000-4000-8000-000000000002',
    'ab300000-0000-4000-8000-000000000001',
    'ab400000-0000-4000-8000-000000000001',
    'Civic Area Sparse Ward Office', 'ward_office',
    null, null, 'sparse@official.gov.test',
    'active', 'verified', false, false, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  ),
  (
    'ab600000-0000-4000-8000-000000000003',
    'ab100000-0000-4000-8000-000000000002',
    'ab300000-0000-4000-8000-000000000001',
    'ab400000-0000-4000-8000-000000000002',
    'Wrong Ward Office', 'ward_office',
    null, '11111111', null,
    'active', 'verified', false, false, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  ),
  (
    'ab600000-0000-4000-8000-000000000004',
    'ab100000-0000-4000-8000-000000000002',
    'ab300000-0000-4000-8000-000000000001',
    'ab400000-0000-4000-8000-000000000001',
    'Unverified Ward Office', 'ward_office',
    null, '22222222', null,
    'active', 'unverified', false, false, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  ),
  (
    'ab600000-0000-4000-8000-000000000005',
    'ab100000-0000-4000-8000-000000000002',
    'ab300000-0000-4000-8000-000000000001',
    'ab400000-0000-4000-8000-000000000001',
    'Repository Ward Office', 'ward_office',
    null, '33333333', null,
    'active', 'verified', false, false, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000002'
  ),
  (
    'ab600000-0000-4000-8000-000000000006',
    'ab100000-0000-4000-8000-000000000002',
    'ab300000-0000-4000-8000-000000000001',
    'ab400000-0000-4000-8000-000000000001',
    'Inactive Ward Office', 'ward_office',
    null, '44444444', null,
    'inactive', 'verified', false, false, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  ),
  (
    'ab600000-0000-4000-8000-000000000007',
    'ab100000-0000-4000-8000-000000000002',
    'ab300000-0000-4000-8000-000000000001',
    'ab400000-0000-4000-8000-000000000001',
    'Placeholder Ward Office', 'ward_office',
    null, '55555555', null,
    'active', 'placeholder', true, false, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  ),
  (
    'ab600000-0000-4000-8000-000000000008',
    'ab100000-0000-4000-8000-000000000002',
    'ab300000-0000-4000-8000-000000000001',
    'ab400000-0000-4000-8000-000000000001',
    'Empty Verified Ward Office', 'ward_office',
    null, null, null,
    'active', 'verified', false, false, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  ),
  (
    'ab600000-0000-4000-8000-000000000009',
    'ab100000-0000-4000-8000-000000000002',
    'ab300000-0000-4000-8000-000000000001',
    null,
    'Municipal Citizen Facilitation Office', 'municipal_head_office',
    '2 Municipal Avenue', null, 'help@official.gov.test',
    'active', 'verified', false, false, date '2026-07-24',
    'ab000000-0000-4000-8000-000000000001'
  );

select is(
  (
    select count(*)::integer
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-24 10:00:00+00'
    )
  ),
  1,
  'the official civic-area fixture resolves once'
);
select is(
  (
    select jsonb_array_length(match -> 'offices')
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-24 10:00:00+00'
    )
  ),
  3,
  'the resolved ward and municipality-wide active verified official-source offices are returned'
);
select ok(
  (
    select
      office ->> 'type' = 'ward_office'
      and office ->> 'address' = '1 Civic Street'
      and office ->> 'phone' = '12345678; 87654321'
      and office ->> 'email' = 'ward-one@official.gov.test'
      and office ->> 'lastVerifiedOn' = '2026-07-24'
      and office ->> 'sourceUrl' = 'https://official.gov.test/civic-area-fixture'
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-24 10:00:00+00'
    )
    cross join lateral jsonb_array_elements(match -> 'offices') as office
    where office ->> 'name' = 'Civic Area Full Ward Office'
  ),
  'the allowed official office fields are projected'
);
select ok(
  (
    select
      not (office ? 'address')
      and not (office ? 'phone')
      and office ->> 'email' = 'sparse@official.gov.test'
      and office ? 'name'
      and office ? 'type'
      and office ? 'lastVerifiedOn'
      and office ? 'sourceUrl'
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-24 10:00:00+00'
    )
    cross join lateral jsonb_array_elements(match -> 'offices') as office
    where office ->> 'name' = 'Civic Area Sparse Ward Office'
  ),
  'nullable office contact fields are omitted rather than emitted as null'
);
select ok(
  (
    select exists (
      select 1
      from jsonb_array_elements(match -> 'offices') as office
      where office ->> 'name' = 'Municipal Citizen Facilitation Office'
        and office ->> 'type' = 'municipal_head_office'
        and office ->> 'email' = 'help@official.gov.test'
    )
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-24 10:00:00+00'
    )
  ),
  'a ward result also includes the resolved local body municipality-wide office'
);
select ok(
  (
    select match::text !~ '"(id|wardId|authorityId|localBodyId|officerMobile|whatsapp|routingRule)"'
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-24 10:00:00+00'
    )
  ),
  'the JSON match contains no internal IDs, officer mobiles, WhatsApp values, or routing fields'
);
select ok(
  (
    select not exists (
      select 1
      from jsonb_array_elements(match -> 'offices') as office
      where office ->> 'name' = 'Wrong Ward Office'
    )
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-24 10:00:00+00'
    )
  ),
  'an office from another ward is not exposed'
);
select ok(
  (
    select not exists (
      select 1
      from jsonb_array_elements(match -> 'offices') as office
      where office ->> 'name' = any(array[
        'Unverified Ward Office',
        'Repository Ward Office',
        'Inactive Ward Office',
        'Placeholder Ward Office',
        'Empty Verified Ward Office'
      ])
    )
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-24 10:00:00+00'
    )
  ),
  'unverified, non-official, inactive, placeholder, and contact-empty offices fail closed'
);
select is(
  (
    select match -> 'localBody' ->> 'name'
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-24 10:00:00+00'
    )
  ),
  'Civic Area Test Municipal Corporation',
  'the existing verified governing-body hierarchy remains available'
);
select is(
  (
    select match -> 'ward' ->> 'name'
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-24 10:00:00+00'
    )
  ),
  'Civic Area Test Ward 1',
  'the existing exact ward projection remains available'
);

select * from finish();
rollback;
