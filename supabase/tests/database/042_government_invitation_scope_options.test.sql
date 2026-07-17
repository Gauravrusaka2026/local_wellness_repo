begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(9);

select has_function(
  'public',
  'list_government_invitation_options',
  array['uuid[]']
);

select ok(not has_function_privilege(
  'anon',
  'public.list_government_invitation_options(uuid[])',
  'execute'
));
select ok(not has_function_privilege(
  'authenticated',
  'public.list_government_invitation_options(uuid[])',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'public.list_government_invitation_options(uuid[])',
  'execute'
));

select is(
  (
    select count(*)::integer
    from jsonb_array_elements(
      public.list_government_invitation_options(
        array['3fabe3b8-47cf-58fe-a59c-bb34bd02322a'::uuid]
      ) -> 'authorities'
    )
  ),
  1,
  'the verified BMC authority is available as one invitation option'
);

select is(
  (
    select count(*)::integer
    from jsonb_array_elements(
      public.list_government_invitation_options(
        array['3fabe3b8-47cf-58fe-a59c-bb34bd02322a'::uuid]
      ) -> 'wards'
    )
  ),
  22,
  'only the 22 verified routable BMC wards are available for ward access'
);

select is(
  (
    select count(*)::integer
    from jsonb_array_elements(
      public.list_government_invitation_options(
        array['3fabe3b8-47cf-58fe-a59c-bb34bd02322a'::uuid]
      ) -> 'departments'
    )
  ),
  20,
  'the verified routable BMC departments are available for department access'
);

select is(
  (
    select
      jsonb_array_length(options -> 'authorities')
      + jsonb_array_length(options -> 'wards')
      + jsonb_array_length(options -> 'departments')
    from (
      select public.list_government_invitation_options(
        array['00000000-0000-4000-8000-000000000099'::uuid]
      ) as options
    ) as unknown_authority
  ),
  0,
  'an unknown or unauthorized authority filter returns no options'
);

select ok(
  not exists (
    select 1
    from (
      select value as option
      from jsonb_array_elements(
        public.list_government_invitation_options(
          array['3fabe3b8-47cf-58fe-a59c-bb34bd02322a'::uuid]
        ) -> 'authorities'
      )
      union all
      select value
      from jsonb_array_elements(
        public.list_government_invitation_options(
          array['3fabe3b8-47cf-58fe-a59c-bb34bd02322a'::uuid]
        ) -> 'wards'
      )
      union all
      select value
      from jsonb_array_elements(
        public.list_government_invitation_options(
          array['3fabe3b8-47cf-58fe-a59c-bb34bd02322a'::uuid]
        ) -> 'departments'
      )
    ) as invitation_option
    where nullif(btrim(invitation_option.option ->> 'id'), '') is null
      or nullif(btrim(invitation_option.option ->> 'code'), '') is null
      or nullif(btrim(invitation_option.option ->> 'name'), '') is null
  ),
  'the invitation catalog contains only complete verified operational choices'
);

select * from finish();
rollback;
