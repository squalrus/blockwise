import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthRepository } from "../auth/repository";
import { requireAuthUser } from "../auth/requireAuthUser";
import type { NeighborhoodAdminRepository } from "./repository";

// Stronger than requireAdmin (apps/api/src/admin/requireAdmin.ts), which only
// proves "an admin of at least one neighborhood" -- this additionally checks
// that the signed-in account is specifically an admin of req.params.id,
// gating the neighborhood profile pages authoring routes (BACKLOG.md) to that
// neighborhood's own admins. Mirrors claims/requireVenueOwner.ts.
export function requireNeighborhoodAdmin(
  getSupabase: () => SupabaseClient,
  getAuthRepository: () => AuthRepository,
  getNeighborhoodAdminRepository: () => NeighborhoodAdminRepository
) {
  const required = requireAuthUser(getSupabase, getAuthRepository);
  return async (req: Request, res: Response, next: NextFunction) => {
    await required(req, res, async () => {
      const isAdmin = await getNeighborhoodAdminRepository().isNeighborhoodAdminFor(
        req.appUser!.id,
        req.params.id
      );
      if (!isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    });
  };
}
