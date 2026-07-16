begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, routing, extensions;

select plan(13);

select ok(
  to_regprocedure(
    'public.resolve_verified_governing_bodies(double precision,double precision,double precision,timestamp with time zone)'
  ) is not null,
  'verified governing-body projection RPC exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.resolve_verified_governing_bodies(double precision,double precision,double precision,timestamp with time zone)',
    'execute'
  ),
  'anonymous clients cannot resolve governing bodies directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.resolve_verified_governing_bodies(double precision,double precision,double precision,timestamp with time zone)',
    'execute'
  ),
  'authenticated clients cannot bypass the API governance boundary'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.resolve_verified_governing_bodies(double precision,double precision,double precision,timestamp with time zone)',
    'execute'
  ),
  'the service role can resolve governing bodies'
);

insert into governance.reference_sources (
  id, title, url, source_type, last_checked_on
)
values
  (
    'aa000000-0000-4000-8000-000000000001',
    'Synthetic official governing-body fixture',
    'https://official.gov.test/governing-body-fixture',
    'official',
    date '2026-07-16'
  ),
  (
    'aa000000-0000-4000-8000-000000000002',
    'Synthetic repository-only fixture',
    'https://repository.test/governing-body-fixture',
    'repository',
    date '2026-07-16'
  );

insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'aa100000-0000-4000-8000-000000000001', null,
    'DIRECTORY_TEST_STATE', 'Directory Test State', 'state',
    'verified', true, date '2026-07-16',
    'aa000000-0000-4000-8000-000000000001'
  ),
  (
    'aa100000-0000-4000-8000-000000000002',
    'aa100000-0000-4000-8000-000000000001',
    'DIRECTORY_TEST_OFFICIAL_BODY', 'Directory Test Official Authority', 'local_body',
    'verified', true, date '2026-07-16',
    'aa000000-0000-4000-8000-000000000001'
  ),
  (
    'aa100000-0000-4000-8000-000000000003',
    'aa100000-0000-4000-8000-000000000001',
    'DIRECTORY_TEST_REPOSITORY_BODY', 'Directory Test Repository Authority', 'local_body',
    'verified', true, date '2026-07-16',
    'aa000000-0000-4000-8000-000000000002'
  );

insert into governance.states (
  id, authority_id, name, iso_code, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'aa200000-0000-4000-8000-000000000001',
  'aa100000-0000-4000-8000-000000000001',
  'Directory Test State', 'DTS', 'verified', true, date '2026-07-16',
  'aa000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'aa300000-0000-4000-8000-000000000001',
    'aa100000-0000-4000-8000-000000000002',
    'aa200000-0000-4000-8000-000000000001',
    'Directory Test Municipal Corporation', 'municipal_corporation',
    'verified', true, date '2026-07-16',
    'aa000000-0000-4000-8000-000000000001'
  ),
  (
    'aa300000-0000-4000-8000-000000000002',
    'aa100000-0000-4000-8000-000000000003',
    'aa200000-0000-4000-8000-000000000001',
    'Repository-only Municipal Corporation', 'municipal_corporation',
    'verified', true, date '2026-07-16',
    'aa000000-0000-4000-8000-000000000002'
  );

insert into governance.wards (
  id, local_body_id, source_ward_code, name, ward_number,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'aa400000-0000-4000-8000-000000000001',
  'aa300000-0000-4000-8000-000000000001',
  'DIRECTORY-WARD-1', 'Directory Test Ward 1', '1',
  'verified', true, date '2026-07-16',
  'aa000000-0000-4000-8000-000000000001'
);

insert into governance.jurisdiction_boundary_versions (
  id, local_body_id, version, boundary, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values
  (
    'aa500000-0000-4000-8000-000000000001',
    'aa300000-0000-4000-8000-000000000001', 1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((73.8 18.5,73.9 18.5,73.9 18.6,73.8 18.6,73.8 18.5)))', 4326
    ),
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-16', 'aa000000-0000-4000-8000-000000000001'
  ),
  (
    'aa500000-0000-4000-8000-000000000002',
    'aa300000-0000-4000-8000-000000000002', 1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((73.8 18.5,73.9 18.5,73.9 18.6,73.8 18.6,73.8 18.5)))', 4326
    ),
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-16', 'aa000000-0000-4000-8000-000000000002'
  );

insert into governance.jurisdiction_boundary_versions (
  id, ward_id, version, boundary, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values (
  'aa500000-0000-4000-8000-000000000003',
  'aa400000-0000-4000-8000-000000000001', 1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((73.8 18.5,73.85 18.5,73.85 18.6,73.8 18.6,73.8 18.5)))', 4326
  ),
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-16', 'aa000000-0000-4000-8000-000000000001'
);

select is(
  (
    select count(*)::integer
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-16 10:00:00+00'
    )
  ),
  1,
  'only the official-source jurisdiction is projected'
);
select is(
  (
    select match -> 'localBody' ->> 'name'
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-16 10:00:00+00'
    )
  ),
  'Directory Test Municipal Corporation',
  'the projection exposes a useful local-body name'
);
select is(
  (
    select match -> 'authority' ->> 'name'
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-16 10:00:00+00'
    )
  ),
  'Directory Test Official Authority',
  'the projection exposes a useful authority name'
);
select is(
  (
    select match -> 'ward' ->> 'name'
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-16 10:00:00+00'
    )
  ),
  'Directory Test Ward 1',
  'the exact verified ward is projected'
);
select ok(
  (
    select
      match -> 'localBody' ->> 'verificationStatus' = 'verified'
      and match -> 'localBody' ->> 'lastVerifiedOn' = '2026-07-16'
      and match -> 'localBody' ->> 'sourceUrl'
        = 'https://official.gov.test/governing-body-fixture'
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-16 10:00:00+00'
    )
  ),
  'verification and official provenance metadata are preserved'
);
select ok(
  (
    select
      match::text not like '%"phone"%'
      and match::text not like '%"email"%'
      and match::text not like '%"geometry"%'
      and match::text not like '%"latitude"%'
      and match::text not like '%"longitude"%'
      and match::text not like '%"id"%'
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-16 10:00:00+00'
    )
  ),
  'the public match contains no identifiers, contacts, or geometry'
);
select is(
  (
    select count(*)::integer
    from public.resolve_verified_governing_bodies(
      74.2, 19.0, 10, timestamptz '2026-07-16 10:00:00+00'
    )
  ),
  0,
  'an unsupported location returns no projection'
);
select ok(
  not exists (
    select 1
    from public.resolve_verified_governing_bodies(
      73.825, 18.55, 10, timestamptz '2026-07-16 10:00:00+00'
    )
    where match -> 'localBody' ->> 'name' = 'Repository-only Municipal Corporation'
  ),
  'repository-only provenance cannot be promoted through the projection'
);
select throws_ok(
  $$
    select *
    from public.resolve_verified_governing_bodies(
      181, 18.55, 10, timestamptz '2026-07-16 10:00:00+00'
    )
  $$,
  '22023',
  'JURISDICTION_EVIDENCE_INVALID',
  'malformed location evidence is rejected'
);

select * from finish();
rollback;
