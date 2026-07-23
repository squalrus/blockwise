import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthRepository } from "../auth/repository";
import { requireBusinessAccount } from "../auth/requireAuthUser";
import type { ClaimRepository } from "./repository";

// Stronger than requireBusinessAccount (apps/api/src/auth/requireAuthUser.ts),
// which only proves "a business account" -- this additionally checks that
// the signed-in account holds an approved claim on req.params.id
// specifically, gating the business owner venue dashboard (BACKLOG.md) and
// its coupon/event authoring routes to that venue's actual owner.
export function requireVenueOwner(
  getSupabase: () => SupabaseClient,
  getAuthRepository: () => AuthRepository,
  getClaimRepository: () => ClaimRepository
) {
  const required = requireBusinessAccount(getSupabase, getAuthRepository);
  return async (req: Request, res: Response, next: NextFunction) => {
    await required(req, res, async () => {
      const owns = await getClaimRepository().isVenueClaimedByUser(req.appUser!.id, req.params.id);
      if (!owns) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    });
  };
}
