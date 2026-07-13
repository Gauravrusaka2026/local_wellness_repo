create or replace function private.is_active_governance_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from governance.authorities as authority
    where authority.id = target_authority_id
      and authority.status = 'active'
      and authority.verification_status <> 'placeholder'
      and not authority.is_placeholder
      and case authority.authority_type
        when 'state' then exists (
          select 1 from governance.states as state
          where state.authority_id = authority.id
            and state.status = 'active'
            and state.verification_status <> 'placeholder'
            and not state.is_placeholder
        )
        when 'district' then exists (
          select 1 from governance.districts as district
          where district.authority_id = authority.id
            and district.status = 'active'
            and district.verification_status <> 'placeholder'
            and not district.is_placeholder
        )
        when 'local_body' then exists (
          select 1 from governance.local_bodies as local_body
          where local_body.authority_id = authority.id
            and local_body.status = 'active'
            and local_body.verification_status <> 'placeholder'
            and not local_body.is_placeholder
        )
        when 'utility' then exists (
          select 1 from governance.utilities as utility
          where utility.authority_id = authority.id
            and utility.status = 'active'
            and utility.verification_status <> 'placeholder'
            and not utility.is_placeholder
        )
        else true
      end
  );
$$;

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_coordinate_envelope_check check (
    extensions.st_xmin(extensions.box3d(boundary)) >= -180
    and extensions.st_xmax(extensions.box3d(boundary)) <= 180
    and extensions.st_ymin(extensions.box3d(boundary)) >= -90
    and extensions.st_ymax(extensions.box3d(boundary)) <= 90
  ) not valid;

alter table governance.jurisdiction_boundary_versions
  validate constraint jurisdiction_boundaries_coordinate_envelope_check;

comment on constraint jurisdiction_boundaries_coordinate_envelope_check
on governance.jurisdiction_boundary_versions is
  'Keeps SRID 4326 boundary coordinates inside the valid longitude and latitude envelope.';

comment on function private.is_active_governance_authority(uuid) is
  'Returns true only for an active, non-placeholder canonical authority with an active non-placeholder typed record where applicable.';
