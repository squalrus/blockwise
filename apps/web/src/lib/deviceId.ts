const STORAGE_KEY = "blockwise_anonymous_device_id";

// README §14.2: every device gets a User row from first launch. This is the
// client-side half -- a stable id generated once and persisted locally, sent
// with check-ins so the API can upsert the same app_user row on repeat visits
// instead of creating a new anonymous identity every time.
export function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, created);
  return created;
}
