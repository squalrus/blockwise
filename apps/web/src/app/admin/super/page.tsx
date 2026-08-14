"use client";

import { useEffect, useState } from "react";
import type { AppUserAdminView } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { StatTile, MushroomIcon } from "../../StatTile";

type State =
  | { status: "loading" }
  | { status: "ready"; users: AppUserAdminView[] }
  | { status: "error"; message: string };

// Overview tab of the super admin shell (BACKLOG.md) -- signed-in/forbidden
// handling lives in layout.tsx, mirroring the neighborhood/business shells'
// Overview tabs, which is why this only tracks loading/ready/error. Reuses
// GET /admin/users (the same call the Users tab makes) for its stat tiles
// rather than adding a dedicated summary endpoint -- the platform is small
// enough that one full user list is cheap either way.
export default function SuperAdminOverviewPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/admin/users"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load platform stats" });
        return;
      }
      setState({ status: "ready", users: await res.json() });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <MushroomLoader size={72} />
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  const { users } = state;
  const businessAccounts = users.filter((u) => u.account_type === "business").length;
  const neighborhoodAdmins = users.filter((u) => u.is_neighborhood_admin).length;
  const superAdmins = users.filter((u) => u.is_super_admin).length;

  return (
    <div className="flex flex-col gap-5.5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Super admin</h1>
        <p className="mt-1 text-[15px] text-body-text">Platform-wide tools, not scoped to any one neighborhood or business.</p>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatTile icon={<MushroomIcon color="var(--brand-orange)" />} label="Users" value={users.length} color="var(--brand-orange)" />
        <StatTile icon={<MushroomIcon color="var(--brand-green)" />} label="Business accounts" value={businessAccounts} color="var(--brand-green)" />
        <StatTile icon={<MushroomIcon color="var(--brand-purple)" />} label="Neighborhood admins" value={neighborhoodAdmins} color="var(--brand-purple)" />
        <StatTile icon={<MushroomIcon color="var(--brand-amber)" />} label="Super admins" value={superAdmins} color="var(--brand-amber)" />
      </div>

      <section className="rounded-3xl bg-nav p-5.5 text-nav-foreground">
        <div className="flex items-center gap-2.5">
          <MushroomIcon color="var(--brand-amber)" />
          <h2 className="font-heading text-[17px] font-extrabold">More on the way</h2>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-nav-muted">
          This is the first cut of the super admin UI -- browse every account under the{" "}
          <a href="/admin/super/users" className="font-bold text-brand-amber hover:underline">
            Users
          </a>{" "}
          tab, or manage the global category taxonomy under{" "}
          <a href="/admin/super/category-taxonomy" className="font-bold text-brand-amber hover:underline">
            Category taxonomy
          </a>
          .
        </p>
      </section>
    </div>
  );
}
