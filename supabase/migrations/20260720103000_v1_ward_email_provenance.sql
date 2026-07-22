-- Preserve the immutable ward-directory evidence used by the private V1
-- complaint-delivery matrix. The columns remain nullable for inactive legacy
-- rows, while the constraint requires complete evidence before a route is active.

alter table routing.ward_issue_contacts
  add column if not exists email_source_url text,
  add column if not exists email_source_as_of date,
  add column if not exists email_last_checked_on date,
  add column if not exists email_source_locator text,
  add column if not exists email_source_reported_status text,
  add column if not exists email_owner_approved_for_routing boolean not null default false;

do $ward_issue_contact_email_provenance_constraint$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'routing.ward_issue_contacts'::regclass
      and constraint_record.conname = 'ward_issue_contacts_active_email_provenance_check'
  ) then
    alter table routing.ward_issue_contacts
      add constraint ward_issue_contacts_active_email_provenance_check check (
        not is_active
        or (
          email_source_url is not null
          and email_source_url = btrim(email_source_url)
          and email_source_url ~ '^https://'
          and email_source_as_of is not null
          and email_last_checked_on is not null
          and email_source_as_of <= email_last_checked_on
          and email_source_locator is not null
          and email_source_locator = btrim(email_source_locator)
          and char_length(email_source_locator) between 1 and 500
          and email_source_reported_status is not null
          and email_source_reported_status = btrim(email_source_reported_status)
          and char_length(email_source_reported_status) between 1 and 80
          and email_owner_approved_for_routing
        )
      ) not valid;
  end if;
end;
$ward_issue_contact_email_provenance_constraint$;

comment on column routing.ward_issue_contacts.email_source_url is
  'Official source URL published in the immutable ward-directory archive for this recipient mailbox.';
comment on column routing.ward_issue_contacts.email_source_as_of is
  'Source-as-of date reported by the ward-directory archive.';
comment on column routing.ward_issue_contacts.email_last_checked_on is
  'Date on which the ward-directory archive last checked the published mailbox.';
comment on column routing.ward_issue_contacts.email_source_locator is
  'Deterministic archive member and record locator for the mailbox evidence.';
comment on column routing.ward_issue_contacts.email_source_reported_status is
  'Raw verification status from the supplied archive; retained separately from the staging approval decision.';
comment on column routing.ward_issue_contacts.email_owner_approved_for_routing is
  'Explicit staging approval that permits this private mailbox to be used by the V1 routing facade.';
