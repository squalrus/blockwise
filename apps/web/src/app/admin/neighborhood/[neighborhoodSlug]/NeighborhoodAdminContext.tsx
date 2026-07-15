"use client";

import { createContext, useContext } from "react";

export interface NeighborhoodAdminContextValue {
  neighborhoodId: string;
  slug: string;
  name: string;
}

const NeighborhoodAdminContext = createContext<NeighborhoodAdminContextValue | null>(null);
export const NeighborhoodAdminProvider = NeighborhoodAdminContext.Provider;

export function useNeighborhoodAdmin(): NeighborhoodAdminContextValue {
  const ctx = useContext(NeighborhoodAdminContext);
  if (!ctx) throw new Error("useNeighborhoodAdmin must be used within [neighborhoodSlug]/layout.tsx");
  return ctx;
}
