begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(37);

select ok(
  exists (select 1 from pg_catalog.pg_namespace where nspname = 'complaints'),
  'private complaints schema exists'
);
select has_table('complaints', 'complaint_drafts', 'durable complaint drafts exist');
select has_table('complaints', 'complaint_location_evidence', 'location evidence exists');
select has_table('complaints', 'complaint_media', 'media intents exist');
select has_table('complaints', 'complaints', 'submitted complaints exist');
select has_table('complaints', 'complaint_assignments', 'initial assignments exist');
select has_table('complaints', 'complaint_status_history', 'status history exists');
select has_table('complaints', 'complaint_submission_requests', 'submission replay ledger exists');
select has_table('complaints', 'duplicate_check_runs', 'duplicate runs exist');
select has_table('complaints', 'duplicate_check_matches', 'duplicate matches exist');

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'complaints'
      and relation.relkind = 'r'
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ),
  30,
  'every complaint table enables and forces RLS'
);

select has_column(
  'routing', 'issue_categories', 'location_verification_requirements',
  'categories carry data-driven location verification requirements'
);
select has_column(
  'complaints', 'complaint_location_evidence', 'device_recorded_at',
  'location evidence preserves the device timestamp'
);
select has_column('complaints', 'complaint_media', 'width_pixels', 'media records image width');
select has_column('complaints', 'complaint_media', 'height_pixels', 'media records image height');
select has_column('complaints', 'complaint_media', 'duration_seconds', 'media records duration');
select has_column(
  'complaints', 'complaint_submission_requests', 'idempotency_key_hash',
  'submission requests persist the hashed idempotency key'
);
select has_column(
  'complaints', 'complaint_submission_requests', 'request_fingerprint',
  'submission requests persist the request fingerprint'
);

select has_index(
  'complaints',
  'complaint_location_evidence',
  'complaint_location_evidence_geography_gix',
  'location evidence has a spatial lookup index'
);
select has_index(
  'complaints', 'complaint_media', 'complaint_media_verified_sha_idx',
  'verified media hashes are indexed for duplicate search'
);
select has_index(
  'complaints', 'complaints', 'complaints_owner_submitted_idx',
  'owned complaint history has a cursor index'
);
select has_index(
  'complaints',
  'complaint_submission_requests',
  'complaint_submission_requests_key_unique',
  'submission idempotency is uniquely indexed per actor'
);

select is(
  (
    select count(*)::integer
    from storage.buckets
    where id in (
      'complaint-originals-private',
      'voice-recordings-private',
      'complaint-thumbnails',
      'resolution-evidence-private'
    )
      and not public
  ),
  4,
  'all Phase 4 media buckets are private'
);
select is(
  (select count(*)::integer from storage.buckets where id = 'complaint-public-media'),
  0,
  'Phase 4 creates no public complaint media bucket'
);

select ok(to_regprocedure('public.create_complaint_draft(uuid,text,text,uuid,uuid,text,text,jsonb)') is not null);
select ok(to_regprocedure('public.append_complaint_location_evidence(uuid,uuid,uuid,text,double precision,double precision,double precision,text,timestamp with time zone,timestamp with time zone,boolean,jsonb)') is not null);
select ok(to_regprocedure('public.reserve_complaint_media(uuid,uuid,uuid,text,text,text,bigint,text,integer,integer,numeric,uuid,timestamp with time zone)') is not null);
select ok(to_regprocedure('public.finalize_complaint_media(uuid,uuid,text,bigint,text)') is not null);
select ok(to_regprocedure('public.find_complaint_duplicate_candidates(uuid,uuid,uuid,timestamp with time zone)') is not null);
select ok(to_regprocedure('public.get_complaint_duplicate_check(uuid,uuid)') is not null);
select ok(to_regprocedure('public.claim_complaint_submission(uuid,uuid,text,text)') is not null);
select ok(to_regprocedure('public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)') is not null);
select ok(to_regprocedure('public.get_routing_decision_replay(uuid,text)') is not null);
select ok(to_regprocedure('public.list_owned_complaints(uuid,integer,timestamp with time zone,uuid)') is not null);
select ok(to_regprocedure('public.get_owned_complaint(uuid,uuid)') is not null);
select ok(to_regprocedure('public.get_complaint_timeline(uuid,uuid)') is not null);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') ~ 'complaint-originals-private|voice-recordings-private|complaint-thumbnails|resolution-evidence-private'
        or coalesce(with_check, '') ~ 'complaint-originals-private|voice-recordings-private|complaint-thumbnails|resolution-evidence-private'
      )
  ),
  0,
  'no broad client Storage object policy is created for private Phase 4 buckets'
);

select * from finish();
rollback;
