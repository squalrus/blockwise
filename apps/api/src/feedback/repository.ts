import type { FeedbackState, FeedbackType } from "@blockwise/types";

export interface FeedbackSubmissionRecord {
  id: string;
  userId: string;
  type: FeedbackType;
  comment: string;
  state: FeedbackState;
  createdAt: string;
  neighborhoodId: string | null;
  venueName: string | null;
}

export interface FeedbackSubmissionAdminRecord extends FeedbackSubmissionRecord {
  userDisplayName: string | null;
  userEmail: string | null;
}

// Abstracts persistence so feedback.ts's submit/update logic can be tested
// against an in-memory fake, mirroring eventFollows/repository.ts.
export interface FeedbackRepository {
  createSubmission(input: {
    userId: string;
    type: FeedbackType;
    comment: string;
    neighborhoodId?: string | null;
    venueName?: string | null;
  }): Promise<FeedbackSubmissionRecord>;
  getSubmission(id: string): Promise<FeedbackSubmissionRecord | null>;
  setSubmissionState(id: string, state: FeedbackState): Promise<FeedbackSubmissionRecord>;
  // bug/feature only -- "missing_venue" submissions are routed to
  // listForNeighborhood below instead, since super admins don't triage them.
  listAllForAdmin(): Promise<FeedbackSubmissionAdminRecord[]>;
  // "missing_venue" submissions for one neighborhood, for that
  // neighborhood's own admins (GET /neighborhood-admin/neighborhoods/:id/feedback).
  listForNeighborhood(neighborhoodId: string): Promise<FeedbackSubmissionAdminRecord[]>;
}
