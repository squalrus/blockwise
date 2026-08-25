import packageJson from "../../package.json";

// The running deploy's version -- single source of truth is
// apps/api/package.json's "version" field, which CLAUDE.md's release
// workflow already bumps in lockstep with the other five package.json files
// on every shipped release, so this needs no separate env var to keep in
// sync. Backs the Monitoring tab's version filter (BACKLOG.md Ref 104
// follow-up), stamped onto every error_log/request_log row the same way
// getAppDomain() stamps the deployment domain.
export function getAppVersion(): string {
  return packageJson.version;
}
