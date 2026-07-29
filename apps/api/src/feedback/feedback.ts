import type { FeedbackState, FeedbackSubmission, FeedbackSubmissionAdminView, FeedbackType } from "@blockwise/types";
import type { FeedbackRepository, FeedbackSubmissionAdminRecord, FeedbackSubmissionRecord } from "./repository";

const COMMENT_MAX_LENGTH = 2000;
const VALID_TYPES: FeedbackType[] = ["bug", "feature"];
const VALID_STATES: FeedbackState[] = ["new", "in_progress", "done", "removed"];

function toFeedbackSubmission(record: FeedbackSubmissionRecord): FeedbackSubmission {
  return {
    id: record.id,
    user_id: record.userId,
    type: record.type,
    comment: record.comment,
    state: record.state,
    created_at: record.createdAt,
  };
}

function toFeedbackSubmissionAdminView(record: FeedbackSubmissionAdminRecord): FeedbackSubmissionAdminView {
  return {
    ...toFeedbackSubmission(record),
    user_display_name: record.userDisplayName,
    user_email: record.userEmail,
  };
}

export type SubmitFeedbackResult =
  | { status: "created"; submission: FeedbackSubmission }
  | { status: "invalid"; message: string };

export async function submitFeedback(
  input: { userId: string; type: string; comment: string },
  repository: FeedbackRepository
): Promise<SubmitFeedbackResult> {
  if (!VALID_TYPES.includes(input.type as FeedbackType)) {
    return { status: "invalid", message: "type must be 'bug' or 'feature'" };
  }

  const comment = input.comment.trim();
  if (!comment) return { status: "invalid", message: "comment is required" };
  if (comment.length > COMMENT_MAX_LENGTH) {
    return { status: "invalid", message: `comment must be ${COMMENT_MAX_LENGTH} characters or fewer` };
  }

  const created = await repository.createSubmission({
    userId: input.userId,
    type: input.type as FeedbackType,
    comment,
  });
  return { status: "created", submission: toFeedbackSubmission(created) };
}

export async function listFeedbackForAdmin(repository: FeedbackRepository): Promise<FeedbackSubmissionAdminView[]> {
  const records = await repository.listAllForAdmin();
  return records.map(toFeedbackSubmissionAdminView);
}

export type UpdateFeedbackStateResult =
  | { status: "updated"; submission: FeedbackSubmission }
  | { status: "invalid"; message: string }
  | { status: "not_found" };

export async function updateFeedbackState(
  id: string,
  state: string,
  repository: FeedbackRepository
): Promise<UpdateFeedbackStateResult> {
  if (!VALID_STATES.includes(state as FeedbackState)) {
    return { status: "invalid", message: "state must be one of: new, in_progress, done, removed" };
  }

  const existing = await repository.getSubmission(id);
  if (!existing) return { status: "not_found" };

  const updated = await repository.setSubmissionState(id, state as FeedbackState);
  return { status: "updated", submission: toFeedbackSubmission(updated) };
}
