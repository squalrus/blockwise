import type { Announcement } from "@blockwise/types";
import type { AnnouncementRecord, AnnouncementRepository } from "./repository";

function toAnnouncement(record: AnnouncementRecord): Announcement {
  return {
    id: record.id,
    venue_id: record.venueId,
    title: record.title,
    body: record.body,
    published: record.published,
    created_at: record.createdAt,
  };
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
}

// The venue itself is already guaranteed to exist and be owned by the caller
// via requireVenueOwner (see claims/requireVenueOwner.ts) on the route that
// calls this, so there's no not_found branch to handle here, unlike
// claims.ts's submitClaim.
export async function createAnnouncement(
  venueId: string,
  input: CreateAnnouncementInput,
  repository: AnnouncementRepository
): Promise<Announcement> {
  const record = await repository.createAnnouncement({
    venueId,
    title: input.title,
    body: input.body,
  });
  return toAnnouncement(record);
}

export async function listAnnouncementsForVenue(
  venueId: string,
  repository: AnnouncementRepository
): Promise<Announcement[]> {
  const records = await repository.listAnnouncementsForVenue(venueId);
  return records.map(toAnnouncement);
}
