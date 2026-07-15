"use client";

import { BusinessVenueDashboard } from "./BusinessVenueDashboard";

// venueId now comes from BusinessAdminContext (set by layout.tsx), same
// pattern as admin/neighborhood/[neighborhoodSlug]/page.tsx taking no params.
export default function BusinessVenueDashboardPage() {
  return <BusinessVenueDashboard />;
}
