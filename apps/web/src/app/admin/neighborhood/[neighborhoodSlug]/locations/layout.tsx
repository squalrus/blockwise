"use client";

import { usePathname } from "next/navigation";

// The pathname suffix past ".../locations" for each sub-page -- used below
// to render a "Locations > Import" style breadcrumb title instead of a
// bare title on every route, mirroring the super-admin Monitoring section's
// layout.tsx. The list (root) route isn't listed here: it's the section
// root, so its title is just its own sidebar label ("Manage" -- see
// ../layout.tsx's TABS, where the Locations tab's children are labeled
// Manage/Import/Troubleshoot). Sub-pages keep their own explanatory
// paragraph right below this -- unlike Monitoring's shared filter header,
// each of these pages has different content, so only the title/breadcrumb
// is centralized here.
const SUB_PAGES: { suffix: string; label: string }[] = [
  { suffix: "/import", label: "Import" },
  { suffix: "/troubleshooting", label: "Troubleshooting" },
];

export default function LocationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentSubPage = SUB_PAGES.find((p) => pathname.endsWith(p.suffix));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-4xl font-extrabold">
        {currentSubPage ? (
          <>
            <span className="text-muted">Locations</span>
            <span className="mx-2 text-muted">›</span>
            {currentSubPage.label}
          </>
        ) : (
          "Manage"
        )}
      </h1>
      {children}
    </div>
  );
}
