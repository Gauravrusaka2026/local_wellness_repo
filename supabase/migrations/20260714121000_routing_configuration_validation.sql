create function public.report_routing_confidence_policy_conflicts()
returns table (
  category_id uuid,
  left_route_rule_id uuid,
  left_route_rule_version_id uuid,
  left_rule_code text,
  left_confidence_policy_version_id uuid,
  left_scope_authority_id uuid,
  left_scope_local_body_id uuid,
  left_scope_ward_id uuid,
  left_asset_type_id uuid,
  left_asset_id uuid,
  right_route_rule_id uuid,
  right_route_rule_version_id uuid,
  right_rule_code text,
  right_confidence_policy_version_id uuid,
  right_scope_authority_id uuid,
  right_scope_local_body_id uuid,
  right_scope_ward_id uuid,
  right_asset_type_id uuid,
  right_asset_id uuid,
  conflict_effective_from timestamptz,
  conflict_effective_to timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with applicable_versions as (
    select
      route_rule.category_id,
      route_rule.id as route_rule_id,
      route_rule.rule_code,
      rule_version.id as route_rule_version_id,
      rule_version.scope_authority_id,
      rule_version.scope_local_body_id,
      rule_version.scope_ward_id,
      rule_version.asset_type_id,
      rule_version.asset_id,
      rule_version.confidence_policy_version_id,
      greatest(rule_version.effective_from, policy_version.effective_from) as applicable_from,
      least(
        coalesce(rule_version.effective_to, 'infinity'::timestamptz),
        coalesce(policy_version.effective_to, 'infinity'::timestamptz)
      ) as applicable_to
    from routing.route_rule_versions as rule_version
    inner join routing.route_rules as route_rule on route_rule.id = rule_version.route_rule_id
    inner join routing.issue_categories as category on category.id = route_rule.category_id
    inner join routing.issue_domains as domain on domain.id = category.domain_id
    inner join routing.confidence_policy_versions as policy_version
      on policy_version.id = rule_version.confidence_policy_version_id
    inner join routing.confidence_policies as policy
      on policy.id = policy_version.confidence_policy_id
    where route_rule.status = 'active'
      and route_rule.verification_status = 'verified'
      and not route_rule.is_placeholder
      and route_rule.is_routing_eligible
      and rule_version.status = 'active'
      and rule_version.verification_status = 'verified'
      and not rule_version.is_placeholder
      and rule_version.is_routing_eligible
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
      and domain.status = 'active'
      and domain.verification_status = 'verified'
      and not domain.is_placeholder
      and domain.is_routing_eligible
      and policy.status = 'active'
      and policy.verification_status = 'verified'
      and not policy.is_placeholder
      and policy.is_routing_eligible
      and policy_version.status = 'active'
      and policy_version.verification_status = 'verified'
      and not policy_version.is_placeholder
      and policy_version.is_routing_eligible
      and (policy_version.category_id is null or policy_version.category_id = category.id)
      and greatest(rule_version.effective_from, policy_version.effective_from) < least(
        coalesce(rule_version.effective_to, 'infinity'::timestamptz),
        coalesce(policy_version.effective_to, 'infinity'::timestamptz)
      )
  ),
  conflicting_pairs as (
    select
      left_version.*,
      right_version.route_rule_id as right_route_rule_id,
      right_version.route_rule_version_id as right_route_rule_version_id,
      right_version.rule_code as right_rule_code,
      right_version.confidence_policy_version_id as right_confidence_policy_version_id,
      right_version.scope_authority_id as right_scope_authority_id,
      right_version.scope_local_body_id as right_scope_local_body_id,
      right_version.scope_ward_id as right_scope_ward_id,
      right_version.asset_type_id as right_asset_type_id,
      right_version.asset_id as right_asset_id,
      right_version.applicable_from as right_applicable_from,
      right_version.applicable_to as right_applicable_to
    from applicable_versions as left_version
    inner join applicable_versions as right_version
      on right_version.category_id = left_version.category_id
      and right_version.route_rule_version_id > left_version.route_rule_version_id
      and right_version.confidence_policy_version_id
        <> left_version.confidence_policy_version_id
      and tstzrange(
        left_version.applicable_from,
        left_version.applicable_to,
        '[)'
      ) && tstzrange(
        right_version.applicable_from,
        right_version.applicable_to,
        '[)'
      )
    where exists (
      select 1
      from governance.local_bodies as local_body
      inner join governance.authorities as authority
        on authority.id = local_body.authority_id
      where local_body.status = 'active'
        and local_body.verification_status = 'verified'
        and not local_body.is_placeholder
        and local_body.is_routing_eligible
        and authority.status = 'active'
        and authority.verification_status = 'verified'
        and not authority.is_placeholder
        and authority.is_routing_eligible
        and (
          left_version.scope_authority_id is null
          or left_version.scope_authority_id = local_body.authority_id
        )
        and (
          right_version.scope_authority_id is null
          or right_version.scope_authority_id = local_body.authority_id
        )
        and (
          left_version.scope_local_body_id is null
          or left_version.scope_local_body_id = local_body.id
        )
        and (
          right_version.scope_local_body_id is null
          or right_version.scope_local_body_id = local_body.id
        )
        and (
          (
            left_version.scope_ward_id is null
            and right_version.scope_ward_id is null
          )
          or exists (
            select 1
            from governance.wards as ward
            where ward.local_body_id = local_body.id
              and ward.status = 'active'
              and ward.verification_status = 'verified'
              and not ward.is_placeholder
              and ward.is_routing_eligible
              and (
                left_version.scope_ward_id is null
                or left_version.scope_ward_id = ward.id
              )
              and (
                right_version.scope_ward_id is null
                or right_version.scope_ward_id = ward.id
              )
          )
        )
    )
      and (
        (
          left_version.asset_type_id is null
          and left_version.asset_id is null
          and right_version.asset_type_id is null
          and right_version.asset_id is null
        )
        or exists (
          select 1
          from routing.assets as asset
          inner join routing.asset_types as asset_type on asset_type.id = asset.asset_type_id
          where asset.status = 'active'
            and asset.verification_status = 'verified'
            and not asset.is_placeholder
            and asset.is_routing_eligible
            and asset_type.status = 'active'
            and asset_type.verification_status = 'verified'
            and not asset_type.is_placeholder
            and asset_type.is_routing_eligible
            and (left_version.asset_id is null or left_version.asset_id = asset.id)
            and (right_version.asset_id is null or right_version.asset_id = asset.id)
            and (
              left_version.asset_type_id is null
              or left_version.asset_type_id = asset.asset_type_id
            )
            and (
              right_version.asset_type_id is null
              or right_version.asset_type_id = asset.asset_type_id
            )
        )
      )
  )
  select
    conflict.category_id,
    conflict.route_rule_id,
    conflict.route_rule_version_id,
    conflict.rule_code,
    conflict.confidence_policy_version_id,
    conflict.scope_authority_id,
    conflict.scope_local_body_id,
    conflict.scope_ward_id,
    conflict.asset_type_id,
    conflict.asset_id,
    conflict.right_route_rule_id,
    conflict.right_route_rule_version_id,
    conflict.right_rule_code,
    conflict.right_confidence_policy_version_id,
    conflict.right_scope_authority_id,
    conflict.right_scope_local_body_id,
    conflict.right_scope_ward_id,
    conflict.right_asset_type_id,
    conflict.right_asset_id,
    greatest(conflict.applicable_from, conflict.right_applicable_from),
    case
      when least(conflict.applicable_to, conflict.right_applicable_to) = 'infinity'::timestamptz
        then null
      else least(conflict.applicable_to, conflict.right_applicable_to)
    end
  from conflicting_pairs as conflict
  order by
    conflict.category_id,
    conflict.route_rule_version_id,
    conflict.right_route_rule_version_id;
$$;

revoke all on function public.report_routing_confidence_policy_conflicts()
  from public, anon, authenticated, service_role;
grant execute on function public.report_routing_confidence_policy_conflicts() to service_role;

comment on function public.report_routing_confidence_policy_conflicts() is
  'Service-only activation report for overlapping operational route-rule versions that reference different confidence policy versions. Runtime routing continues to fail closed independently.';
