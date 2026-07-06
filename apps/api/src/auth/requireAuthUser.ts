import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUserRecord, AuthRepository } from "./repository";
import { verifyAccessToken } from "./verifyToken";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      appUser?: AppUserRecord | null;
    }
  }
}

function bearerToken(req: Request): string | null {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

// Takes getters rather than instances so the Supabase client/repository are
// constructed lazily on first request, mirroring the getVenueRepository()
// etc. pattern in app.ts (constructing eagerly at createApp() time would
// crash every route, including /health, on a misconfigured environment).
async function resolveAppUser(
  req: Request,
  getSupabase: () => SupabaseClient,
  getRepository: () => AuthRepository
): Promise<AppUserRecord | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const verified = await verifyAccessToken(getSupabase(), token);
  if (!verified) return null;

  return getRepository().getByAuthUserId(verified.authUserId);
}

// Resolves the caller's app_user row from a Supabase access token onto
// req.appUser without failing the request if it's missing/invalid -- used by
// routes (like claim submission) that work anonymously but attach identity
// when available.
export function attachOptionalAuthUser(
  getSupabase: () => SupabaseClient,
  getRepository: () => AuthRepository
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    req.appUser = await resolveAppUser(req, getSupabase, getRepository);
    next();
  };
}

// Same resolution, but rejects the request outright if no valid session
// resolves to a known app_user row.
export function requireAuthUser(getSupabase: () => SupabaseClient, getRepository: () => AuthRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const appUser = await resolveAppUser(req, getSupabase, getRepository);
    if (!appUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.appUser = appUser;
    next();
  };
}

export function requireBusinessAccount(
  getSupabase: () => SupabaseClient,
  getRepository: () => AuthRepository
) {
  const required = requireAuthUser(getSupabase, getRepository);
  return async (req: Request, res: Response, next: NextFunction) => {
    await required(req, res, () => {
      if (req.appUser?.accountType !== "business") {
        res.status(403).json({ error: "Business account required" });
        return;
      }
      next();
    });
  };
}
