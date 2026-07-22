-- Local Wellness hosted database performance audit.
--
-- Run in Supabase Dashboard > SQL Editor while the slowdown is observable.
-- This script is read-only. The normalized query text in the result is
-- operationally sensitive and must not be pasted into public issue trackers.

begin transaction read only;
set local statement_timeout = '20s';

select
  extension.extname,
  extension.extversion,
  namespace.nspname as extension_schema
from pg_catalog.pg_extension as extension
inner join pg_catalog.pg_namespace as namespace on namespace.oid = extension.extnamespace
where extension.extname in ('index_advisor', 'hypopg', 'pg_stat_statements', 'postgis')
order by extension.extname;

select
  setting.name,
  setting.setting
from pg_catalog.pg_settings as setting
where setting.name in (
  'compute_query_id',
  'pg_stat_statements.track',
  'shared_preload_libraries',
  'track_functions',
  'track_io_timing'
)
order by setting.name;

select
  statistics.stats_reset,
  statistics.numbackends as active_connections,
  statistics.xact_commit,
  statistics.xact_rollback,
  statistics.blks_read,
  statistics.blks_hit,
  round(
    100 * statistics.blks_hit::numeric
      / nullif(statistics.blks_hit + statistics.blks_read, 0),
    2
  ) as buffer_cache_hit_percent,
  statistics.temp_files,
  pg_catalog.pg_size_pretty(statistics.temp_bytes) as temporary_data_written
from pg_catalog.pg_stat_database as statistics
where statistics.datname = pg_catalog.current_database();

-- Highest cumulative execution cost since the statistics reset.
select
  statement.queryid,
  statement.calls,
  round(statement.total_exec_time::numeric, 2) as total_exec_ms,
  round(statement.mean_exec_time::numeric, 2) as mean_exec_ms,
  round(statement.max_exec_time::numeric, 2) as max_exec_ms,
  statement.rows,
  statement.shared_blks_hit,
  statement.shared_blks_read,
  statement.temp_blks_read,
  statement.temp_blks_written,
  left(pg_catalog.regexp_replace(statement.query, '\s+', ' ', 'g'), 500) as normalized_query
from extensions.pg_stat_statements as statement
where statement.dbid = (
  select database.oid
  from pg_catalog.pg_database as database
  where database.datname = pg_catalog.current_database()
)
order by statement.total_exec_time desc
limit 40;

-- Local Wellness RPCs most likely to affect report capture and public feeds.
select
  statement.queryid,
  statement.calls,
  round(statement.total_exec_time::numeric, 2) as total_exec_ms,
  round(statement.mean_exec_time::numeric, 2) as mean_exec_ms,
  round(statement.max_exec_time::numeric, 2) as max_exec_ms,
  statement.shared_blks_hit,
  statement.shared_blks_read,
  statement.temp_blks_written,
  left(pg_catalog.regexp_replace(statement.query, '\s+', ' ', 'g'), 500) as normalized_query
from extensions.pg_stat_statements as statement
where statement.dbid = (
  select database.oid
  from pg_catalog.pg_database as database
  where database.datname = pg_catalog.current_database()
)
and statement.query ilike any(array[
  '%claim_kpi_calculation_runs%',
  '%claim_notification_outbox%',
  '%claim_realtime_deliveries%',
  '%claim_sla_escalation_jobs%',
  '%consume_api_rate_limit%',
  '%find_complaint_duplicate_candidates%',
  '%list_public_complaint_feed%',
  '%list_public_complaint_hotspots%',
  '%list_routing_categories%',
  '%resolve_jurisdiction_context%',
  '%resolve_routing_candidates%',
  '%submit_complaint%'
])
order by statement.total_exec_time desc;

-- Currently running or waiting database work. Query text can include literals.
select
  activity.pid,
  activity.usename,
  activity.application_name,
  activity.state,
  activity.wait_event_type,
  activity.wait_event,
  pg_catalog.clock_timestamp() - coalesce(activity.query_start, activity.xact_start) as age,
  left(pg_catalog.regexp_replace(activity.query, '\s+', ' ', 'g'), 300) as query
from pg_catalog.pg_stat_activity as activity
where activity.datname = pg_catalog.current_database()
  and activity.pid <> pg_catalog.pg_backend_pid()
  and activity.state <> 'idle'
order by age desc;

-- Sequential scans, dead tuples, and autovacuum state on known hot tables.
select
  statistics.schemaname,
  statistics.relname,
  statistics.n_live_tup,
  statistics.n_dead_tup,
  statistics.seq_scan,
  statistics.seq_tup_read,
  statistics.idx_scan,
  statistics.n_tup_ins,
  statistics.n_tup_upd,
  statistics.n_tup_del,
  statistics.last_autovacuum,
  statistics.last_autoanalyze
from pg_catalog.pg_stat_user_tables as statistics
where (statistics.schemaname, statistics.relname) in (values
  ('complaints', 'complaint_media'),
  ('complaints', 'complaint_submission_requests'),
  ('complaints', 'duplicate_check_matches'),
  ('complaints', 'duplicate_check_runs'),
  ('complaints', 'kpi_calculation_runs'),
  ('complaints', 'notification_deliveries'),
  ('complaints', 'notification_outbox'),
  ('complaints', 'public_complaint_engagements'),
  ('complaints', 'sla_escalation_jobs'),
  ('governance', 'jurisdiction_boundary_versions'),
  ('private', 'api_rate_limit_windows'),
  ('routing', 'asset_versions'),
  ('routing', 'assets'),
  ('routing', 'route_rule_versions'),
  ('routing', 'route_rules'),
  ('routing', 'routing_decisions')
)
order by statistics.n_dead_tup desc, statistics.seq_tup_read desc;

select
  indexes.schemaname,
  indexes.relname,
  indexes.indexrelname,
  indexes.idx_scan,
  indexes.idx_tup_read,
  indexes.idx_tup_fetch,
  pg_catalog.pg_size_pretty(pg_catalog.pg_relation_size(indexes.indexrelid)) as index_size,
  pg_catalog.pg_get_indexdef(indexes.indexrelid) as index_definition
from pg_catalog.pg_stat_user_indexes as indexes
where (indexes.schemaname, indexes.relname) in (values
  ('complaints', 'complaint_media'),
  ('complaints', 'complaint_submission_requests'),
  ('complaints', 'duplicate_check_matches'),
  ('complaints', 'duplicate_check_runs'),
  ('governance', 'jurisdiction_boundary_versions'),
  ('routing', 'asset_versions'),
  ('routing', 'assets'),
  ('routing', 'route_rule_versions'),
  ('routing', 'route_rules')
)
order by indexes.schemaname, indexes.relname, indexes.idx_scan desc;

select
  tables.schemaname,
  tables.relname,
  pg_catalog.pg_size_pretty(
    pg_catalog.pg_total_relation_size(
      pg_catalog.format('%I.%I', tables.schemaname, tables.relname)::pg_catalog.regclass
    )
  ) as total_size,
  tables.n_live_tup,
  tables.seq_scan,
  tables.idx_scan
from pg_catalog.pg_stat_user_tables as tables
order by pg_catalog.pg_total_relation_size(
  pg_catalog.format('%I.%I', tables.schemaname, tables.relname)::pg_catalog.regclass
) desc
limit 30;

commit;
