import type { NextFunction, Request, Response } from "express";

// No admin auth system exists yet (see BACKLOG.md's "Admin portal" item for
// the eventual real thing) -- a shared secret is the pragmatic MVP for a
// single-operator project at this scale. Fails closed if unconfigured, same
// spirit as getSupabaseClient() throwing on a missing env var.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) {
    res.status(500).json({ error: "ADMIN_API_TOKEN is not configured" });
    return;
  }

  if (req.header("x-admin-token") !== token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
