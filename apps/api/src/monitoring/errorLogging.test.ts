import { describe, expect, it } from "vitest";
import { installErrorLogging } from "./errorLogging";
import type { ErrorLogEntry, MonitoringRepository, RequestLogEntry } from "./repository";
import type { MonitoringAnalytics } from "@blockwise/types";

// In-memory fake, mirroring FakeSuperAdminRepository in pushSubscriptions.test.ts.
class FakeMonitoringRepository implements MonitoringRepository {
  logged: ErrorLogEntry[] = [];

  async logError(entry: ErrorLogEntry): Promise<void> {
    this.logged.push(entry);
  }
  async logRequest(_entry: RequestLogEntry): Promise<void> {}
  async getAnalytics(): Promise<MonitoringAnalytics> {
    throw new Error("not implemented");
  }
}

describe("installErrorLogging", () => {
  // installErrorLogging is a process-wide singleton (it guards against
  // double-installing the console.error wrapper, mirroring how it's called
  // exactly once from createApp() in production) -- both cases share one
  // install/repo, not one each, matching that real-world semantics.
  const repo = new FakeMonitoringRepository();
  installErrorLogging(() => repo);

  it("persists a console.error call, extracting message/stack from an Error argument", async () => {
    const err = new Error("boom");
    console.error("GET /locations/:id failed:", err);

    // logError is fire-and-forget -- flush the microtask queue before asserting.
    await new Promise((resolve) => setImmediate(resolve));

    const entry = repo.logged.find((e) => e.message === "GET /locations/:id failed:");
    expect(entry).toMatchObject({ source: "api", stack: err.stack, context: null });
  });

  it("falls back to a stringified label when console.error is called with a single non-Error argument", async () => {
    console.error("something failed with no error object");
    await new Promise((resolve) => setImmediate(resolve));

    const entry = repo.logged.find((e) => e.message === "something failed with no error object");
    expect(entry).toMatchObject({ source: "api", stack: null, context: null });
  });
});
