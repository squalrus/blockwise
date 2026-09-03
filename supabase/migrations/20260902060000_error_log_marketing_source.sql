-- Monitoring tab gains a third error source: apps/marketing now reports its
-- own client errors (window.onerror/unhandledrejection + error boundaries,
-- mirroring apps/web's reporter) through POST /monitoring/client-errors
-- tagged source: "marketing", proxied same-origin via that site's own
-- netlify.toml redirect rather than opening CORS on apps/api.
alter table error_log drop constraint error_log_source_check;
alter table error_log add constraint error_log_source_check
  check (source in ('api', 'web', 'marketing'));
