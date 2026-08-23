import type { Metadata } from "next";
import { PoweredByGoogle } from "@blockwise/ui";
import { apiUrl } from "@/lib/api";
import { EnrichmentAbout, EnrichmentPhotos } from "../../../EnrichmentSection";
import { getLocation } from "../layout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { alternates: { canonical: `/location/${id}/about` } };
}

// About tab (BACKLOG.md Ref 101 redesign) -- the photo strip (moved here
// from the shared layout so it's not repeated chrome on every tab) leads,
// then Google Places enrichment (price/hours/phone/website/atmosphere),
// shown for business-kind locations and any POI with a google_place_id.
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
      {(isBusiness || location.google_place_id) && (
        <EnrichmentPhotos
          enrichment={location.enrichment}
          photoUrl={(index) => apiUrl(`/locations/${location.id}/photo?index=${index}`)}
          alt={location.name}
        />
      )}
      <EnrichmentAbout
        enrichment={location.enrichment}
        emptyLabel={
          isBusiness
            ? "No enrichment data available for this venue."
            : "No enrichment data available for this point of interest."
        }
      />
      {location.enrichment && <PoweredByGoogle />}
    </div>
  );
}
