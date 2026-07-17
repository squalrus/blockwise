import type { Checkin, MushroomConfig, MushroomCustomization, SpotShape } from "@blockwise/types";
import { snapshotMushroomForUser } from "@blockwise/types";
import { haversineMeters } from "../places/geo";
import type { CheckinRecord, CheckinRepository } from "./repository";

// MushroomCustomization's spotShape is a plain string (packages/types has no
// dependency on the SpotShape union it validates against server-side, per
// isValidMushroomCustomization) -- narrow it for snapshotMushroomForUser,
// mirroring apps/web's Avatar.tsx.
function toMushroomConfig(customization: MushroomCustomization | null): MushroomConfig | null {
  return customization ? { ...customization, spotShape: customization.spotShape as SpotShape } : null;
}

// README §4 Phase 1: "GPS geofence check-in (radius check against
// Venue.lat/lng)". 100m comfortably covers GPS drift for a single-building
// venue without also catching a neighboring storefront. Reused as-is for POI
// check-ins (BACKLOG.md Ref 6).
export const CHECKIN_RADIUS_METERS = 100;

// README §4: "one check-in per venue per 4–6 hours" to prevent gaming
// streaks/badges -- 4 hours is the floor of that range. Applies per location.
export const CHECKIN_COOLDOWN_MS = 4 * 60 * 60 * 1000;

// A separate, shorter cooldown against the user's *most recent check-in
// anywhere* (not just this location) -- without this, a user could satisfy
// a multi-venue challenge like "check in to 5 coffee shops" in seconds by
// rapid-tapping through nearby venues. 2 minutes rules out scripted/instant
// abuse without blocking a real multi-stop visit.
export const GLOBAL_CHECKIN_COOLDOWN_MS = 2 * 60 * 1000;

export interface EvaluateCheckinInput {
  target: { lat: number; lng: number };
  device: { lat: number; lng: number };
  lastCheckinForTarget: CheckinRecord | null;
  lastCheckinAnywhere: CheckinRecord | null;
  now: number;
  radiusMeters?: number;
  cooldownMs?: number;
  globalCooldownMs?: number;
}

// Which cooldown produced the retryAt -- "target" means this same location
// was checked into recently, "global" means a *different* location was
// checked into recently (the cross-venue anti-gaming cooldown). The two need
// distinct copy since "you checked in here recently" is false when the
// global cooldown is what's actually blocking the request.
export type CheckinCooldownScope = "target" | "global";

export type CheckinDecision =
  | { allowed: true }
  | { allowed: false; reason: "too_far"; distanceMeters: number }
  | { allowed: false; reason: "cooldown"; retryAt: string; scope: CheckinCooldownScope };

function cooldownRetryAt(lastCheckin: CheckinRecord, now: number, cooldownMs: number): Date | null {
  const elapsedMs = now - new Date(lastCheckin.checkedInAt).getTime();
  if (elapsedMs >= cooldownMs) return null;
  return new Date(new Date(lastCheckin.checkedInAt).getTime() + cooldownMs);
}

export function evaluateCheckin(input: EvaluateCheckinInput): CheckinDecision {
  const radiusMeters = input.radiusMeters ?? CHECKIN_RADIUS_METERS;
  const cooldownMs = input.cooldownMs ?? CHECKIN_COOLDOWN_MS;
  const globalCooldownMs = input.globalCooldownMs ?? GLOBAL_CHECKIN_COOLDOWN_MS;

  const distanceMeters = haversineMeters(input.target, input.device);
  if (distanceMeters > radiusMeters) {
    return { allowed: false, reason: "too_far", distanceMeters };
  }

  const targetRetryAt =
    input.lastCheckinForTarget && cooldownRetryAt(input.lastCheckinForTarget, input.now, cooldownMs);
  const globalRetryAt =
    input.lastCheckinAnywhere && cooldownRetryAt(input.lastCheckinAnywhere, input.now, globalCooldownMs);

  const candidates: { scope: CheckinCooldownScope; retryAt: Date }[] = [
    ...(targetRetryAt ? [{ scope: "target" as const, retryAt: targetRetryAt }] : []),
    ...(globalRetryAt ? [{ scope: "global" as const, retryAt: globalRetryAt }] : []),
  ];

  if (candidates.length > 0) {
    const winner = candidates.reduce((latest, candidate) => (candidate.retryAt > latest.retryAt ? candidate : latest));
    return { allowed: false, reason: "cooldown", retryAt: winner.retryAt.toISOString(), scope: winner.scope };
  }

  return { allowed: true };
}

export type CheckinResult =
  | { status: "created"; checkin: Checkin }
  | { status: "not_found" }
  | { status: "too_far"; distanceMeters: number }
  | { status: "cooldown"; retryAt: string; scope: CheckinCooldownScope };

function toCheckin(record: CheckinRecord): Checkin {
  return {
    id: record.id,
    user_id: record.userId,
    venue_id: record.venueId,
    device_lat: record.deviceLat,
    device_lng: record.deviceLng,
    checked_in_at: record.checkedInAt,
    mushroom_snapshot: record.mushroomSnapshot,
  };
}

export async function performCheckin(
  locationId: string,
  userId: string,
  device: { lat: number; lng: number },
  repository: CheckinRepository,
  now: number = Date.now()
): Promise<CheckinResult> {
  const location = await repository.getLocation(locationId);
  if (!location) return { status: "not_found" };

  const [lastCheckinForTarget, lastCheckinAnywhere] = await Promise.all([
    repository.getLastCheckinForLocation(userId, locationId),
    repository.getLastCheckinAnywhere(userId),
  ]);

  const decision = evaluateCheckin({
    target: location,
    device,
    lastCheckinForTarget,
    lastCheckinAnywhere,
    now,
  });
  if (!decision.allowed) {
    if (decision.reason === "too_far") {
      return { status: "too_far", distanceMeters: decision.distanceMeters };
    }
    return { status: "cooldown", retryAt: decision.retryAt, scope: decision.scope };
  }

  const customization = await repository.getMushroomCustomization(userId);
  const created = await repository.createCheckin({
    userId,
    venueId: locationId,
    deviceLat: device.lat,
    deviceLng: device.lng,
    mushroomSnapshot: snapshotMushroomForUser(userId, toMushroomConfig(customization)),
  });
  return { status: "created", checkin: toCheckin(created) };
}
