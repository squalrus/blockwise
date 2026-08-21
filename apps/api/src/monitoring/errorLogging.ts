import type { MonitoringRepository } from "./repository";

// Wraps console.error so every existing "<label> failed:", err call site
// across apps/api/src (~120 of them, all following that one convention, per
// BACKLOG.md Ref 104's survey) also persists a row to error_log, without
// touching each call site individually. Only installed from createApp()
// (see app.ts), so unit tests that exercise domain functions directly
// against fakes never trigger it. Fire-and-forget throughout -- a logging
// failure must never affect the response the caller is already sending back,
// or crash the process via an unhandled rejection of its own.
let installed = false;

export function installErrorLogging(getRepository: () => MonitoringRepository): void {
  if (installed) return;
  installed = true;

  const originalConsoleError = console.error.bind(console);

  console.error = (...args: unknown[]) => {
    originalConsoleError(...args);
    persist(getRepository, "api", args);
  };

  process.on("unhandledRejection", (reason) => {
    originalConsoleError("unhandledRejection:", reason);
    persist(getRepository, "api", ["unhandledRejection:", reason]);
  });

  process.on("uncaughtException", (err) => {
    originalConsoleError("uncaughtException:", err);
    persist(getRepository, "api", ["uncaughtException:", err]);
  });
}

function persist(getRepository: () => MonitoringRepository, source: "api" | "web", args: unknown[]): void {
  try {
    const [label, errArg] = args;
    const err = errArg instanceof Error ? errArg : args.find((a) => a instanceof Error);
    const message = typeof label === "string" ? label : String(label ?? "error");
    const stack = err instanceof Error ? (err.stack ?? null) : null;
    const context = !(err instanceof Error) && errArg !== undefined ? safeContext(errArg) : null;

    getRepository()
      .logError({ source, message, stack, context })
      .catch(() => {
        // Best-effort only -- deliberately not calling console.error here to
        // avoid recursing back into the wrapper above.
      });
  } catch {
    // getRepository() itself can throw synchronously (e.g. Supabase env vars
    // missing) -- never let that propagate out of a console.error call.
  }
}

function safeContext(value: unknown): Record<string, unknown> | null {
  try {
    return { value: JSON.parse(JSON.stringify(value)) };
  } catch {
    return { value: String(value) };
  }
}
