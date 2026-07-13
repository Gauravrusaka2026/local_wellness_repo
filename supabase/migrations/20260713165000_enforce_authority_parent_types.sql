create function governance.reject_invalid_authority_parent_types()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from governance.authorities as child
    left join governance.authorities as parent on parent.id = child.parent_authority_id
    where
      (child.authority_type = 'state' and child.parent_authority_id is not null)
      or (
        child.authority_type in ('district', 'state_agency')
        and (parent.id is null or parent.authority_type <> 'state')
      )
      or (
        child.authority_type = 'local_body'
        and (parent.id is null or parent.authority_type not in ('state', 'district'))
      )
      or (
        child.authority_type in ('utility', 'emergency_service')
        and (
          parent.id is null
          or parent.authority_type not in ('state', 'district', 'local_body')
        )
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Authority parent type is incompatible with child authority type.';
  end if;

  return null;
end;
$$;

create constraint trigger authorities_reject_invalid_parent_types
after insert or update of parent_authority_id, authority_type
on governance.authorities
deferrable initially immediate
for each row execute function governance.reject_invalid_authority_parent_types();

revoke all on function governance.reject_invalid_authority_parent_types()
from public, anon, authenticated;

comment on function governance.reject_invalid_authority_parent_types() is
  'Rejects parentless or type-incompatible structured authority hierarchies after each statement.';
