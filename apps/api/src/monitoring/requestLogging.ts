import type { NextFunction, Request, Response } from "express";
import type { MonitoringRepository } from "./repository";

// Backs the Monitoring tab's request-volume/latency charts (BACKLOG.md Ref
// 104). One middleware, mounted once in createApp() after the Netlify
// path-prefix stripping so req.path already matches what every route
// handler sees -- no per-route changes needed. Fire-and-forget, like
// installErrorLogging: never delays or fails the response it's timing.
export function requestLoggingMiddleware(getRepository: () => MonitoringRepository) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    res.on("finish", () => {
      getRepository()
        .logRequest({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        })
        .catch(() => {
          // Best-effort only.
        });
    });

    next();
  };
}
