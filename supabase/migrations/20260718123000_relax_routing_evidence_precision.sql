-- Preserve routing safety while avoiding false mismatches caused by client/DB
-- timestamp precision and GPS serialization differences.
create or replace function complaints.complaint_routing_evidence_mismatches(
  p_actor_user_id uuid,
  p_submission_request_id uuid,
  p_routing_decision_id uuid
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  submission complaints.complaint_submission_requests%rowtype;
  draft complaints.complaint_drafts%rowtype;
  evidence complaints.complaint_location_evidence%rowtype;
  decision routing.routing_decisions%rowtype;
  mismatches text[] := '{}'::text[];
begin
  select request.* into submission
  from complaints.complaint_submission_requests as request
  where request.id = p_submission_request_id
    and request.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select candidate.* into draft
  from complaints.complaint_drafts as candidate
  where candidate.id = submission.draft_id
    and candidate.citizen_user_id = p_actor_user_id;

  if not found or draft.selected_location_evidence_id is null then
    return mismatches;
  end if;

  select location.* into evidence
  from complaints.complaint_location_evidence as location
  where location.id = draft.selected_location_evidence_id
    and location.draft_id = draft.id
    and location.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select route.* into decision
  from routing.routing_decisions as route
  where route.id = p_routing_decision_id;

  if not found then
    return array['COMPLAINT_ROUTING_DECISION_NOT_FOUND']::text[];
  end if;

  if decision.actor_user_id is distinct from p_actor_user_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACTOR_MISMATCH');
  end if;
  if decision.request_id is distinct from submission.routing_request_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_REQUEST_MISMATCH');
  end if;
  if decision.decision_status is distinct from 'routed' then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_STATUS_MISMATCH');
  end if;
  if decision.category_id is distinct from draft.category_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CATEGORY_MISMATCH');
  end if;
  if decision.asset_id is distinct from draft.asset_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ASSET_MISMATCH');
  end if;
  if not extensions.st_dwithin(
    decision.input_location::extensions.geography,
    evidence.location::extensions.geography,
    2.0
  ) then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_LOCATION_MISMATCH');
  end if;
  if decision.accuracy_meters is null
    or evidence.accuracy_meters is null
    or abs(decision.accuracy_meters - evidence.accuracy_meters) > 0.5 then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACCURACY_MISMATCH');
  end if;
  if decision.captured_at is null
    or evidence.captured_at is null
    or abs(extract(epoch from (decision.captured_at - evidence.captured_at))) > 2 then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CAPTURE_TIME_MISMATCH');
  end if;

  return mismatches;
end;
$$;

revoke all on function complaints.complaint_routing_evidence_mismatches(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
