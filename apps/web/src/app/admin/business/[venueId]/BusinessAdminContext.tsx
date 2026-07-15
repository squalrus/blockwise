"use client";

import { createContext, useContext } from "react";

export interface BusinessAdminContextValue {
  venueId: string;
  name: string;
  address: string;
}

const BusinessAdminContext = createContext<BusinessAdminContextValue | null>(null);
export const BusinessAdminProvider = BusinessAdminContext.Provider;

export function useBusinessAdmin(): BusinessAdminContextValue {
  const ctx = useContext(BusinessAdminContext);
  if (!ctx) throw new Error("useBusinessAdmin must be used within admin/business/[venueId]/layout.tsx");
  return ctx;
}
