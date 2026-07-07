import { BusinessVenueDashboard } from "./BusinessVenueDashboard";

// Server wrapper only -- unwraps the async params (Next.js App Router) and
// hands a plain string down to the client component, which can't itself be
// an async function. Mirrors venues/[id]/page.tsx's params shape.
export default async function BusinessVenueDashboardPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = await params;
  return <BusinessVenueDashboard venueId={venueId} />;
}
