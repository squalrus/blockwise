export interface AnnouncementRecord {
  id: string;
  venueId: string;
  title: string;
  body: string;
  published: boolean;
  createdAt: string;
}

export interface CreateAnnouncementInput {
  venueId: string;
  title: string;
  body: string;
}

// Abstracts persistence so createAnnouncement/listAnnouncementsForVenue
// (announcements.ts) can be tested against an in-memory fake, mirroring
// claims/repository.ts.
export interface AnnouncementRepository {
  createAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementRecord>;
  // Backs both the owner-side dashboard and the public venue detail page --
  // every announcement is published immediately (no moderation queue yet,
  // see the migration's header comment), so there's no separate published-only
  // variant to worry about.
  listAnnouncementsForVenue(venueId: string): Promise<AnnouncementRecord[]>;
}
