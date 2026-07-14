do $$
declare
  requested_count integer;
  matched_count integer;
begin
  with requested_wards (local_body_name, source_ward_code, selection_rank) as (
    values
      ('Pune Municipal Corporation', 'PUNE-W01', 1::smallint),
      ('Pune Municipal Corporation', 'PUNE-W02', 2::smallint),
      ('Pune Municipal Corporation', 'PUNE-W03', 3::smallint),
      ('Pune Municipal Corporation', 'PUNE-W04', 4::smallint),
      ('Pune Municipal Corporation', 'PUNE-W05', 5::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W01', 1::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W02', 2::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W03', 3::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W04', 4::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W05', 5::smallint)
  )
  select count(*) into requested_count from requested_wards;

  with requested_wards (local_body_name, source_ward_code, selection_rank) as (
    values
      ('Pune Municipal Corporation', 'PUNE-W01', 1::smallint),
      ('Pune Municipal Corporation', 'PUNE-W02', 2::smallint),
      ('Pune Municipal Corporation', 'PUNE-W03', 3::smallint),
      ('Pune Municipal Corporation', 'PUNE-W04', 4::smallint),
      ('Pune Municipal Corporation', 'PUNE-W05', 5::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W01', 1::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W02', 2::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W03', 3::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W04', 4::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W05', 5::smallint)
  )
  select count(*)
  into matched_count
  from requested_wards as requested
  inner join governance.local_bodies as local_body
    on local_body.name = requested.local_body_name
  inner join governance.wards as ward
    on ward.local_body_id = local_body.id
    and ward.source_ward_code = requested.source_ward_code;

  if requested_count <> 10 or matched_count <> requested_count then
    raise exception using
      errcode = '23514',
      message = 'SYNC_PILOT_WARD_SCOPE_CANONICAL_MATCH_FAILED';
  end if;

  with requested_wards (local_body_name, source_ward_code, selection_rank) as (
    values
      ('Pune Municipal Corporation', 'PUNE-W01', 1::smallint),
      ('Pune Municipal Corporation', 'PUNE-W02', 2::smallint),
      ('Pune Municipal Corporation', 'PUNE-W03', 3::smallint),
      ('Pune Municipal Corporation', 'PUNE-W04', 4::smallint),
      ('Pune Municipal Corporation', 'PUNE-W05', 5::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W01', 1::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W02', 2::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W03', 3::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W04', 4::smallint),
      ('Brihanmumbai Municipal Corporation', 'BRIH-W05', 5::smallint)
  )
  insert into governance.sync_scope_targets (
    scope_group_key,
    scope_key,
    target_kind,
    authority_id,
    local_body_id,
    ward_id,
    selection_rank,
    status,
    verification_status,
    is_routing_eligible,
    selection_notes
  )
  select
    'municipal_governance_sync_pilot_v1',
    'municipal_governance_sync_pilot_v1:ward:' || lower(requested.source_ward_code),
    'ward',
    local_body.authority_id,
    local_body.id,
    ward.id,
    requested.selection_rank,
    'draft',
    'unverified',
    false,
    case
      when requested.source_ward_code like 'BRIH-%' then
        'Engineering-only pilot selection. The numeric bootstrap ward is a placeholder and must be reconciled to the official BMC ward structure before activation or routing.'
      else
        'Engineering-only pilot selection. The bootstrap ward remains placeholder, unverified, without an approved boundary, and non-routable.'
    end
  from requested_wards as requested
  inner join governance.local_bodies as local_body
    on local_body.name = requested.local_body_name
  inner join governance.wards as ward
    on ward.local_body_id = local_body.id
    and ward.source_ward_code = requested.source_ward_code
  on conflict (scope_key) do nothing;

  if (
    select count(*)
    from governance.sync_scope_targets
    where scope_group_key = 'municipal_governance_sync_pilot_v1'
  ) <> requested_count then
    raise exception using
      errcode = '23514',
      message = 'SYNC_PILOT_WARD_SCOPE_SEED_INCOMPLETE';
  end if;
end;
$$;
