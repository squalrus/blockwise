"use client";

import { createContext, useContext } from "react";

// Lets a tab route (e.g. neighbors/page.tsx after accepting a request) ask
// account/layout.tsx to recompute the shared ProfileSummaryCard counts,
// without a full page reload -- mirrors the old single-page account's
// `loadAccount(setState)` re-fetch, just crossing a route boundary now that
// each tab is its own page.
const AccountRefreshContext = createContext<() => void>(() => {});

export const AccountRefreshProvider = AccountRefreshContext.Provider;

export function useAccountRefresh(): () => void {
  return useContext(AccountRefreshContext);
}
