-- Run only after bmc_submission_runtime_audit.sql reports that the submit
-- wrapper, implementation, service-role grant, and required triggers pass.

begin;

do $submission_cache_reload_preflight$
begin
  if pg_catalog.to_regprocedure(
    'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)'
  ) is null
    or pg_catalog.to_regprocedure(
      'public.submit_complaint_phase4_impl(uuid,uuid,uuid,uuid[],boolean)'
    ) is null
    or not pg_catalog.has_function_privilege(
      'service_role',
      'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)',
      'EXECUTE'
    ) then
    raise exception using
      errcode = '55000',
      message = 'LOCAL_WELLNESS_SUBMISSION_RUNTIME_NOT_READY',
      hint = 'Run bmc_submission_runtime_audit.sql and repair the failed schema check before reloading PostgREST.';
  end if;
end;
$submission_cache_reload_preflight$;

select pg_catalog.pg_notify('pgrst', 'reload schema');

commit;
