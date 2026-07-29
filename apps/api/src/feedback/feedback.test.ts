import { describe, expect, it } from "vitest";
import { submitFeedback, listFeedbackForAdmin, updateFeedbackState } from "./feedback";
import type { FeedbackRepository, FeedbackSubmissionAdminRecord, FeedbackSubmissionRecord } from "./repository";
import type { FeedbackState, FeedbackType } from "@blockwise/types";

// In-memory fake, mirroring FakeEventFollowRepository in eventFollows/eventFollow.test.ts.
class FakeFeedbackRepository implements FeedbackRepository {
  submissions: FeedbackSubmissionRecord[] = [];
  private nextId = 1;

  async createSubmission(input: { userId: string; type: FeedbackType; comment: string }): Promise<FeedbackSubmissionRecord> {
    const record: FeedbackSubmissionRecord = {
      id: `submission-${this.nextId++}`,
      userId: input.userId,
      type: input.type,
      comment: input.comment,
      state: "new",
      createdAt: new Date().toISOString(),
    };
    this.submissions.push(record);
    return record;
  }

  async getSubmission(id: string): Promise<FeedbackSubmissionRecord | null> {
    return this.submissions.find((s) => s.id === id) ?? null;
  }

  async setSubmissionState(id: string, state: FeedbackState): Promise<FeedbackSubmissionRecord> {
    const record = this.submissions.find((s) => s.id === id);
    if (!record) throw new Error("not found");
    record.state = state;
    return record;
  }

  async listAllForAdmin(): Promise<FeedbackSubmissionAdminRecord[]> {
    return this.submissions.map((s) => ({ ...s, userDisplayName: "Test User", userEmail: "test@example.com" }));
  }
}

describe("submitFeedback", () => {
  it("creates a submission with trimmed comment", async () => {
    const repo = new FakeFeedbackRepository();
    const result = await submitFeedback({ userId: "user-1", type: "bug", comment: "  Something broke  " }, repo);

    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.submission).toMatchObject({
        user_id: "user-1",
        type: "bug",
        comment: "Something broke",
        state: "new",
      });
    }
    expect(repo.submissions).toHaveLength(1);
  });

  it("rejects an invalid type", async () => {
    const repo = new FakeFeedbackRepository();
    const result = await submitFeedback({ userId: "user-1", type: "not_a_type", comment: "hi" }, repo);
    expect(result.status).toBe("invalid");
    expect(repo.submissions).toHaveLength(0);
  });

  it("rejects an empty or whitespace-only comment", async () => {
    const repo = new FakeFeedbackRepository();
    const result = await submitFeedback({ userId: "user-1", type: "feature", comment: "   " }, repo);
    expect(result.status).toBe("invalid");
    expect(repo.submissions).toHaveLength(0);
  });

  it("rejects a comment over the length limit", async () => {
    const repo = new FakeFeedbackRepository();
    const result = await submitFeedback({ userId: "user-1", type: "feature", comment: "x".repeat(2001) }, repo);
    expect(result.status).toBe("invalid");
    expect(repo.submissions).toHaveLength(0);
  });
});

describe("updateFeedbackState", () => {
  it("returns not_found for an unknown submission", async () => {
    const repo = new FakeFeedbackRepository();
    const result = await updateFeedbackState("missing", "done", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("rejects an invalid state", async () => {
    const repo = new FakeFeedbackRepository();
    const created = await repo.createSubmission({ userId: "user-1", type: "bug", comment: "hi" });
    const result = await updateFeedbackState(created.id, "archived", repo);
    expect(result.status).toBe("invalid");
    expect((await repo.getSubmission(created.id))?.state).toBe("new");
  });

  it("updates the submission's state", async () => {
    const repo = new FakeFeedbackRepository();
    const created = await repo.createSubmission({ userId: "user-1", type: "bug", comment: "hi" });

    const result = await updateFeedbackState(created.id, "done", repo);
    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.submission.state).toBe("done");
    }
  });
});

describe("listFeedbackForAdmin", () => {
  it("maps records to the admin view shape", async () => {
    const repo = new FakeFeedbackRepository();
    await repo.createSubmission({ userId: "user-1", type: "bug", comment: "hi" });

    const list = await listFeedbackForAdmin(repo);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ user_display_name: "Test User", user_email: "test@example.com" });
  });
});
