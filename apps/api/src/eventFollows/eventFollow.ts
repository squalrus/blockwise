import type { EventFollow } from "@blockwise/types";
import type { EventFollowRecord, EventFollowRepository } from "./repository";

function toEventFollow(record: EventFollowRecord): EventFollow {
  return {
    id: record.id,
    user_id: record.userId,
    event_id: record.eventId,
    created_at: record.createdAt,
  };
}

export type FollowEventResult =
  | { status: "created" | "already_following"; follow: EventFollow }
  | { status: "not_found" };

export async function followEvent(
  eventId: string,
  userId: string,
  repository: EventFollowRepository
): Promise<FollowEventResult> {
  if (!(await repository.eventExists(eventId))) return { status: "not_found" };

  const existing = await repository.getFollow(userId, eventId);
  if (existing) return { status: "already_following", follow: toEventFollow(existing) };

  const created = await repository.createFollow(userId, eventId);
  return { status: "created", follow: toEventFollow(created) };
}

export type UnfollowEventResult = { status: "removed" | "not_found" };

export async function unfollowEvent(
  eventId: string,
  userId: string,
  repository: EventFollowRepository
): Promise<UnfollowEventResult> {
  if (!(await repository.eventExists(eventId))) return { status: "not_found" };

  await repository.deleteFollow(userId, eventId);
  return { status: "removed" };
}

export type EventFollowStatusResult =
  | { status: "found"; following: boolean }
  | { status: "not_found" };

export async function getEventFollowStatus(
  eventId: string,
  userId: string,
  repository: EventFollowRepository
): Promise<EventFollowStatusResult> {
  if (!(await repository.eventExists(eventId))) return { status: "not_found" };

  const existing = await repository.getFollow(userId, eventId);
  return { status: "found", following: existing !== null };
}
