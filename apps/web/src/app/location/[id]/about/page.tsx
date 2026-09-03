import type { Metadata } from "next";
import { PoweredByGeoapify } from "@blockwise/ui";
import { EnrichmentAbout } from "../../../EnrichmentSection";
import { getLocation } from "../layout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { alternates: { canonical: `/location/${id}/about` } };
}

// About tab (BACKLOG.md Ref 101 redesign) -- Places enrichment
// (hours/phone/website/description), shown for business-kind locations and
// any POI with a geoapify_place_id.
export default async function LocationAboutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const location = await getLocation(id);
  if (!location) return null;

  const isBusiness = location.kind === "business";

  return (
    <div className="flex flex-col gap-2.5">
      <EnrichmentAbout
        enrichment={location.enrichment}
        emptyLabel={
          isBusiness
            ? "No enrichment data available for this venue."
            : "No enrichment data available for this point of interest."
        }
      />
      {location.enrichment && <PoweredByGeoapify />}
    </div>
  );
}
