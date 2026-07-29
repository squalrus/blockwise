import type { FeedbackState, FeedbackType } from "@blockwise/types";

export interface FeedbackSubmissionRecord {
  id: string;
  userId: string;
  type: FeedbackType;
  comment: string;
  state: FeedbackState;
  createdAt: string;
}

export interface FeedbackSubmissionAdminRecord extends FeedbackSubmissionRecord {
  userDisplayName: string | null;
  userEmail: string | null;
}

// Abstracts persistence so feedback.ts's submit/update logic can be tested
// against an in-memory fake, mirroring eventFollows/repository.ts.
export interface FeedbackRepository {
  createSubmission(input: { userId: string; type: FeedbackType; comment: string }): Promise<FeedbackSubmissionRecord>;
  // No admin UI yet -- state is moved via PATCH /admin/feedback/:id directly.
  getSubmission(id: string): Promise<FeedbackSubmissionRecord | null>;
  setSubmissionState(id: string, state: FeedbackState): Promise<FeedbackSubmissionRecord>;
  listAllForAdmin(): Promise<FeedbackSubmissionAdminRecord[]>;
}
