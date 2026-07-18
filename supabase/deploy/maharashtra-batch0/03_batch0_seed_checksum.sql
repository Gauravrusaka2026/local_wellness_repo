-- Generated companion for the Maharashtra Batch 0 seed.
-- Records the main seed SHA-256 without making the seed self-referential.
begin;
do $maharashtra_batch0_checksum$
declare
  affected_rows integer;
begin
  update governance.import_batches
  set generated_seed_sha256 = 'cc0c42f336269f1a98665ebade85b051684619a63b02454954943ee05cec3b2b'
  where id = '5c20d3be-d9ad-5fa1-b16b-2e390e1b21ca'
    and dataset_key = 'maharashtra_governance_batch0'
    and dataset_version = 'MH-LW-BATCH0-2026-07-18'
    and (
      generated_seed_sha256 is null
      or generated_seed_sha256 = 'cc0c42f336269f1a98665ebade85b051684619a63b02454954943ee05cec3b2b'
    );

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_CHECKSUM_BATCH_MISMATCH';
  end if;
end
$maharashtra_batch0_checksum$;
commit;
