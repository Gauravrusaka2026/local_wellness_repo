create table governance.sync_scope_targets (
  id uuid primary key default gen_random_uuid(),
  scope_group_key text not null,
  scope_key text not null,
  target_kind text not null,
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  selection_rank smallint,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  is_routing_eligible boolean not null default false,
  selection_notes text,
  last_verified_on date,
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_scope_targets_group_key_check check (
    scope_group_key = btrim(scope_group_key)
    and scope_group_key ~ '^[a-z][a-z0-9:_-]{1,159}$'
  ),
  constraint sync_scope_targets_scope_key_check check (
    scope_key = btrim(scope_key)
    and scope_key ~ '^[a-z][a-z0-9:_-]{1,239}$'
  ),
  constraint sync_scope_targets_scope_key_unique unique (scope_key),
  constraint sync_scope_targets_kind_check check (
    target_kind in ('authority', 'local_body', 'ward')
  ),
  constraint sync_scope_targets_shape_check check (
    (target_kind = 'authority' and local_body_id is null and ward_id is null)
    or (target_kind = 'local_body' and local_body_id is not null and ward_id is null)
    or (target_kind = 'ward' and local_body_id is not null and ward_id is not null)
  ),
  constraint sync_scope_targets_rank_check check (
    selection_rank is null or selection_rank between 1 and 32767
  ),
  constraint sync_scope_targets_status_check check (
    status in ('draft', 'active', 'paused', 'retired')
  ),
  constraint sync_scope_targets_verification_status_check check (
    verification_status in (
      'placeholder',
      'unverified',
      'source_verified',
      'manually_verified',
      'conflicting',
      'superseded',
      'stale'
    )
  ),
  constraint sync_scope_targets_notes_check check (
    selection_notes is null
    or (
      selection_notes = btrim(selection_notes)
      and char_length(selection_notes) between 1 and 2000
    )
  ),
  constraint sync_scope_targets_review_shape_check check (
    (approved_at is null and approved_by is null)
    or (approved_at is not null and approved_by is not null)
  ),
  constraint sync_scope_targets_active_review_check check (
    status <> 'active'
    or (
      verification_status = 'manually_verified'
      and last_verified_on is not null
      and approved_at is not null
      and approved_by is not null
    )
  ),
  constraint sync_scope_targets_routing_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'manually_verified'
      and last_verified_on is not null
      and approved_at is not null
      and approved_by is not null
    )
  ),
  constraint sync_scope_targets_retired_check check (
    status <> 'retired' or verification_status in ('superseded', 'stale')
  )
);

alter table governance.local_bodies
  add constraint local_bodies_id_authority_id_unique unique (id, authority_id);

alter table governance.wards
  add constraint wards_id_local_body_id_unique unique (id, local_body_id);

alter table governance.sync_scope_targets
  add constraint sync_scope_targets_local_body_authority_fkey
  foreign key (local_body_id, authority_id)
  references governance.local_bodies (id, authority_id)
  on delete restrict,
  add constraint sync_scope_targets_ward_local_body_fkey
  foreign key (ward_id, local_body_id)
  references governance.wards (id, local_body_id)
  on delete restrict;

create unique index sync_scope_targets_group_authority_unique
on governance.sync_scope_targets (scope_group_key, authority_id)
where target_kind = 'authority';

create unique index sync_scope_targets_group_local_body_unique
on governance.sync_scope_targets (scope_group_key, local_body_id)
where target_kind = 'local_body';

create unique index sync_scope_targets_group_ward_unique
on governance.sync_scope_targets (scope_group_key, ward_id)
where target_kind = 'ward';

create unique index sync_scope_targets_group_local_body_rank_unique
on governance.sync_scope_targets (scope_group_key, local_body_id, selection_rank)
where target_kind = 'ward' and selection_rank is not null;

create index sync_scope_targets_group_status_rank_idx
on governance.sync_scope_targets (scope_group_key, status, selection_rank, id);

create index sync_scope_targets_authority_status_idx
on governance.sync_scope_targets (authority_id, status, id);

create index sync_scope_targets_local_body_status_idx
on governance.sync_scope_targets (local_body_id, status, id)
where local_body_id is not null;

create function private.enforce_governance_sync_scope_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_is_required boolean;
  target_is_routing_eligible boolean;
begin
  if tg_op = 'UPDATE' and (
    new.scope_group_key is distinct from old.scope_group_key
    or new.scope_key is distinct from old.scope_key
    or new.target_kind is distinct from old.target_kind
    or new.authority_id is distinct from old.authority_id
    or new.local_body_id is distinct from old.local_body_id
    or new.ward_id is distinct from old.ward_id
  ) then
    raise exception using
      errcode = '55000',
      message = 'SYNC_SCOPE_TARGET_IDENTITY_IMMUTABLE';
  end if;

  if tg_op = 'INSERT' then
    review_is_required := new.verification_status = 'manually_verified'
      or new.status = 'active'
      or new.is_routing_eligible;
  else
    review_is_required := new.status = 'active'
      or new.is_routing_eligible
      or (
        new.verification_status = 'manually_verified'
        and (
          old.verification_status is distinct from new.verification_status
          or old.approved_at is distinct from new.approved_at
          or old.approved_by is distinct from new.approved_by
          or old.last_verified_on is distinct from new.last_verified_on
        )
      );
  end if;

  if review_is_required then
    if new.approved_at is null
      or new.approved_by is null
      or new.last_verified_on is null
      or new.approved_at > current_timestamp
      or new.last_verified_on > current_date
      or not private.user_has_active_role(
        new.approved_by,
        'platform_admin',
        'global',
        null
      ) then
      raise exception using
        errcode = '23514',
        message = 'SYNC_SCOPE_TARGET_REVIEW_REQUIRED';
    end if;
  end if;

  if new.is_routing_eligible then
    case new.target_kind
      when 'authority' then
        select
          authority.status = 'active'
          and authority.verification_status = 'verified'
          and not authority.is_placeholder
          and authority.is_routing_eligible
        into target_is_routing_eligible
        from governance.authorities as authority
        where authority.id = new.authority_id;
      when 'local_body' then
        select
          local_body.status = 'active'
          and local_body.verification_status = 'verified'
          and not local_body.is_placeholder
          and local_body.is_routing_eligible
        into target_is_routing_eligible
        from governance.local_bodies as local_body
        where local_body.id = new.local_body_id;
      when 'ward' then
        select
          ward.status = 'active'
          and ward.verification_status = 'verified'
          and not ward.is_placeholder
          and ward.is_routing_eligible
        into target_is_routing_eligible
        from governance.wards as ward
        where ward.id = new.ward_id;
    end case;

    if not coalesce(target_is_routing_eligible, false) then
      raise exception using
        errcode = '23514',
        message = 'SYNC_SCOPE_TARGET_NOT_ROUTABLE';
    end if;
  end if;

  return new;
end;
$$;

create trigger sync_scope_targets_enforce
before insert or update on governance.sync_scope_targets
for each row execute function private.enforce_governance_sync_scope_target();

create trigger sync_scope_targets_set_updated_at
before update on governance.sync_scope_targets
for each row execute function private.set_updated_at();

alter table governance.sync_scope_targets enable row level security;
alter table governance.sync_scope_targets force row level security;

revoke all on governance.sync_scope_targets
from public, anon, authenticated, service_role;
grant select, insert, update on governance.sync_scope_targets to service_role;

revoke all on function private.enforce_governance_sync_scope_target() from public;

comment on table governance.sync_scope_targets is
  'Review-gated, service-only synchronization target selection. A target being selected for synchronization never makes its referenced governance entity routable.';

comment on column governance.sync_scope_targets.scope_group_key is
  'Stable data-driven grouping for a pilot or future statewide synchronization scope.';

comment on column governance.sync_scope_targets.is_routing_eligible is
  'Independent safety gate that can be true only after platform review and only when the referenced canonical entity is itself verified and routing eligible.';
