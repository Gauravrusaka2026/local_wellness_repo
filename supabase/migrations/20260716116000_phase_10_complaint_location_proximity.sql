alter table routing.issue_categories
  alter column location_verification_requirements set default jsonb_build_object(
    'maximumAccuracyMeters', 50,
    'maximumAgeSeconds', 300
  ),
  alter column media_requirements set default jsonb_build_object(
    'maximumCaptureDistanceMeters', 50
  );

update routing.issue_categories
set
  location_verification_requirements = jsonb_set(
    location_verification_requirements,
    '{maximumAccuracyMeters}',
    '50'::jsonb,
    true
  ),
  media_requirements = jsonb_set(
    media_requirements,
    '{maximumCaptureDistanceMeters}',
    '50'::jsonb,
    true
  );

alter table routing.issue_categories
  add constraint issue_categories_v1_location_accuracy_check check (
    (location_verification_requirements ->> 'maximumAccuracyMeters')::numeric <= 50
  ),
  add constraint issue_categories_v1_media_proximity_check check (
    jsonb_typeof(media_requirements -> 'maximumCaptureDistanceMeters') = 'number'
    and (media_requirements ->> 'maximumCaptureDistanceMeters')::numeric between 1 and 50
  );

create function complaints.enforce_v1_location_proximity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  maximum_accuracy double precision;
  maximum_media_distance double precision;
  selected_location extensions.geometry(Point, 4326);
  capture_distance double precision;
begin
  select
    (category.location_verification_requirements ->> 'maximumAccuracyMeters')::double precision,
    (category.media_requirements ->> 'maximumCaptureDistanceMeters')::double precision,
    selected.location
  into maximum_accuracy, maximum_media_distance, selected_location
  from complaints.complaint_drafts as draft
  inner join routing.issue_categories as category on category.id = draft.category_id
  left join complaints.complaint_location_evidence as selected
    on selected.id = draft.selected_location_evidence_id
  where draft.id = new.draft_id
    and draft.citizen_user_id = new.actor_user_id;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_LOCATION_CATEGORY_REQUIRED';
  end if;

  if new.accuracy_meters > maximum_accuracy then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_LOCATION_ACCURACY_EXCEEDS_V1_LIMIT';
  end if;

  if new.evidence_type = 'media_capture' then
    if selected_location is null then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_CURRENT_LOCATION_REQUIRED';
    end if;

    capture_distance := extensions.st_distance(
      new.location::extensions.geography,
      selected_location::extensions.geography
    );

    if capture_distance > maximum_media_distance then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_MEDIA_LOCATION_MISMATCH';
    end if;
  end if;

  return new;
end;
$$;

create trigger complaint_location_evidence_enforce_v1_proximity
before insert on complaints.complaint_location_evidence
for each row
execute function complaints.enforce_v1_location_proximity();

revoke all on function complaints.enforce_v1_location_proximity() from public;

comment on function complaints.enforce_v1_location_proximity() is
  'Fail-closed V1 guard requiring at most 50 metre device accuracy and at most 50 metre media-to-issue distance.';
