import type { Metadata } from "next";
import { PoweredByGoogle } from "@blockwise/ui";
import { EnrichmentReviews } from "../../../EnrichmentSection";
import { getLocation } from "../layout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { alternates: { canonical: `/location/${id}/reviews` } };
}

// Reviews tab (BACKLOG.md Ref 101 redesign) -- Google's aggregate rating
// plus sampled reviews.
export default async function LocationReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const location = await getLocation(id);
  if (!location) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <EnrichmentReviews enrichment={location.enrichment} />
      {location.enrichment && <PoweredByGoogle />}
    </div>
  );
}
