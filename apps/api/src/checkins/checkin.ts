import type { Checkin } from "@blockwise/types";
import { haversineMeters } from "../places/geo";
import type { CheckinRecord, CheckinRepository, VenueLocation } from "./repository";

// README §4 Phase 1: "GPS geofence check-in (radius check against
// Venue.lat/lng)". 100m comfortably covers GPS drift for a single-building
// venue without also catching a neighboring storefront.
export const CHECKIN_RADIUS_METERS = 100;

// README §4: "one check-in per venue per 4–6 hours" to prevent gaming
// streaks/badges -- 4 hours is the floor of that range.
export const CHECKIN_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export interface EvaluateCheckinInput {
  venue: VenueLocation;
  device: { lat: number; lng: number };
  lastCheckin: CheckinRecord | null;
  now: number;
  radiusMeters?: number;
  cooldownMs?: number;
}

export type CheckinDecision =
  | { allowed: true }
  | { allowed: false; reason: "too_far"; distanceMeters: number }
  | { allowed: false; reason: "cooldown"; retryAt: string };

export function evaluateCheckin(input: EvaluateCheckinInput): CheckinDecision {
  const radiusMeters = input.radiusMeters ?? CHECKIN_RADIUS_METERS;
  const cooldownMs = input.cooldownMs ?? CHECKIN_COOLDOWN_MS;

  const distanceMeters = haversineMeters(
    { lat: input.venue.lat, lng: input.venue.lng },
    input.device
  );
  if (distanceMeters > radiusMeters) {
    return { allowed: false, reason: "too_far", distanceMeters };
  }

  if (input.lastCheckin) {
    const elapsedMs = input.now - new Date(input.lastCheckin.checkedInAt).getTime();
    if (elapsedMs < cooldownMs) {
      const retryAt = new Date(new Date(input.lastCheckin.checkedInAt).getTime() + cooldownMs);
      return { allowed: false, reason: "cooldown", retryAt: retryAt.toISOString() };
    }
  }

  return { allowed: true };
}

export type CheckinResult =
  | { status: "created"; checkin: Checkin }
  | { status: "not_found" }
  | { status: "too_far"; distanceMeters: number }
  | { status: "cooldown"; retryAt: string };

function toCheckin(record: CheckinRecord): Checkin {
  return {
    id: record.id,
    user_id: record.userId,
    venue_id: record.venueId,
    device_lat: record.deviceLat,
    device_lng: record.deviceLng,
    checked_in_at: record.checkedInAt,
  };
}

export async function performCheckin(
  venueId: string,
  anonymousDeviceId: string,
  device: { lat: number; lng: number },
  repository: CheckinRepository,
  now: number = Date.now()
): Promise<CheckinResult> {
  const venue = await repository.getVenueLocation(venueId);
  if (!venue) return { status: "not_found" };

  const userId = await repository.getOrCreateAnonymousUser(anonymousDeviceId);
  const lastCheckin = await repository.getLastCheckin(userId, venueId);

  const decision = evaluateCheckin({ venue, device, lastCheckin, now });
  if (!decision.allowed) {
    if (decision.reason === "too_far") {
      return { status: "too_far", distanceMeters: decision.distanceMeters };
    }
    return { status: "cooldown", retryAt: decision.retryAt };
  }

  const created = await repository.createCheckin({
    userId,
    venueId,
    deviceLat: device.lat,
    deviceLng: device.lng,
  });
  return { status: "created", checkin: toCheckin(created) };
}
