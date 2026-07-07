import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthRepository } from "../auth/repository";
import { requireAuthUser } from "../auth/requireAuthUser";
import type { NeighborhoodAdminRepository } from "./repository";

// Replaces the previous shared ADMIN_API_TOKEN secret with per-account admin
// roles (BACKLOG.md "Neighborhood admin invites") -- the caller must be
// signed in (same Bearer-token session as every other /auth/*-gated route)
// and hold a neighborhood_admin row. Every admin route today lists/updates
// across all venues/claims/categories globally rather than being scoped to
// one neighborhood's resources, so "is admin of at least one neighborhood" is
// the correct check until admin routes themselves become neighborhood-scoped.
export function requireAdmin(
  getSupabase: () => SupabaseClient,
  getAuthRepository: () => AuthRepository,
  getNeighborhoodAdminRepository: () => NeighborhoodAdminRepository
) {
  const required = requireAuthUser(getSupabase, getAuthRepository);
  return async (req: Request, res: Response, next: NextFunction) => {
    await required(req, res, async () => {
      const isAdmin = await getNeighborhoodAdminRepository().isNeighborhoodAdmin(req.appUser!.id);
      if (!isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    });
  };
}
