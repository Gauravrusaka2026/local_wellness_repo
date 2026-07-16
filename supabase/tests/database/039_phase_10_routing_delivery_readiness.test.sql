begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, governance, extensions;

select plan(10);

select has_function(
  'governance',
  'resolve_complaint_contact_readiness',
  array['uuid', 'uuid', 'uuid', 'uuid', 'uuid', 'uuid', 'uuid']
);
select has_function('complaints', 'assignment_delivery_readiness', array['uuid']);
select function_returns(
  'governance',
  'resolve_complaint_contact_readiness',
  array['uuid', 'uuid', 'uuid', 'uuid', 'uuid', 'uuid', 'uuid'],
  'jsonb'
);
select function_returns(
  'complaints',
  'assignment_delivery_readiness',
  array['uuid'],
  'jsonb'
);
select ok(not has_function_privilege(
  'anon',
  'governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)',
  'execute'
));
select ok(not has_function_privilege(
  'authenticated',
  'governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)',
  'execute'
));
select ok(not has_function_privilege(
  'anon',
  'complaints.assignment_delivery_readiness(uuid)',
  'execute'
));
select ok(not has_function_privilege(
  'authenticated',
  'complaints.assignment_delivery_readiness(uuid)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'complaints.assignment_delivery_readiness(uuid)',
  'execute'
));

select * from finish();
rollback;
