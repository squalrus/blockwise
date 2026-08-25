-- Backfills error_log.domain (20260825020000) for historical web-sourced
-- errors from the URL they already carried before that column existed --
-- every source='web' report (ClientErrorReporter.tsx's window.onerror/
-- unhandledrejection listeners, and the error.tsx/global-error.tsx
-- boundaries) has always included context.url = window.location.href, so
-- the hostname is recoverable even though domain itself wasn't stamped yet.
--
-- source='api' rows and every request_log row have no URL/origin captured
-- anywhere (the console.error wrapper has no request in scope, and
-- request_log only ever stored method/path/status/duration), so there's
-- nothing to backfill for those -- they stay domain = NULL, same as today,
-- visible under "All domains" but not under a specific domain filter.
update error_log
set domain = substring(context ->> 'url' from '^https?://([^/:]+)')
where source = 'web'
  and domain is null
  and context ->> 'url' is not null;
