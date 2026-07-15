import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthRepository } from "../auth/repository";
import { requireAuthUser } from "../auth/requireAuthUser";
import type { SuperAdminRepository } from "./repository";

// A rung above requireAdmin's "admin of at least one neighborhood" check
// (BACKLOG.md) -- gates creating a brand-new neighborhood (POST
// /admin/neighborhoods) while the platform is still small enough that
// unrestricted neighborhood creation isn't ready to open up, and lets a
// super admin bypass the 24h "Reimport Locations" cooldown.
export function requireSuperAdmin(
  getSupabase: () => SupabaseClient,
  getAuthRepository: () => AuthRepository,
  getSuperAdminRepository: () => SuperAdminRepository
) {
  const required = requireAuthUser(getSupabase, getAuthRepository);
  return async (req: Request, res: Response, next: NextFunction) => {
    await required(req, res, async () => {
      const isSuperAdmin = await getSuperAdminRepository().isSuperAdmin(req.appUser!.id);
      if (!isSuperAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    });
  };
}
