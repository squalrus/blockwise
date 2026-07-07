import { NeighborhoodAdminDashboard } from "./NeighborhoodAdminDashboard";

// Server wrapper only -- unwraps the async params (Next.js App Router) and
// hands a plain string down to the client component, which can't itself be
// an async function. Mirrors business/[venueId]/page.tsx's params shape.
export default async function NeighborhoodAdminDashboardPage({
  params,
}: {
  params: Promise<{ neighborhoodId: string }>;
}) {
  const { neighborhoodId } = await params;
  return <NeighborhoodAdminDashboard neighborhoodId={neighborhoodId} />;
}
