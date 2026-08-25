import { MushroomLogo } from "@blockwise/ui";
import { EntityTile, EntityTypeChip } from "../../../../../EntityTile";
import { PlaceListItem, pinColorFor, shapeFor } from "../../../../../PlaceListItem";
import { LocationSummaryCard } from "../../../../../location/[id]/LocationSummaryCard";
import { CollectionCard } from "../../../../../account/(tabs)/collection/page";
import { TopCapsSection } from "../../../../../profile/[username]/TopCapsSection";
import { COLLECTION_ENTRIES, LOCATION_CARDS } from "../../demoData";

const BUSINESS_LOCATION = LOCATION_CARDS[0].location;
const SPECIES_ENTRIES = COLLECTION_ENTRIES.filter((e) => e.style === "Checkin -- business");

// Entity-first view of "business" -- see entities/neighborhood/page.tsx for
// the pattern this follows.
export default function EntityBusinessPage() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Business</h1>
        <p className="mt-1 text-sm text-muted">Every representation of a claimed business location across the app, side by side.</p>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Identity tile</p>
        <p className="text-xs text-muted">
          EntityTile + EntityTypeChip -- the header mark on the summary card below, and the corner mark
          CollectionCard reuses on the collected-species card further down. Unlike neighborhood&apos;s fixed enoki
          mark, the mushroom shape/color here is deterministic per venue id (shapeFor/pinColorFor, same as its list
          row and every other venue list in the app).
        </p>
        <div className="flex items-center gap-5">
          <EntityTile kind="business">
            <MushroomLogo
              size={38}
              shape={shapeFor(BUSINESS_LOCATION.id)}
              capColor={pinColorFor(BUSINESS_LOCATION.id)}
              stemClassName="text-muted-strong"
            />
          </EntityTile>
          <span className="relative h-9 w-9 rounded-full bg-card-alt">
            <EntityTypeChip kind="business" size={24} positionClassName="right-0 bottom-0" />
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">List row</p>
        <p className="text-xs text-muted">
          PlaceListItem, as rendered on /checkin and every neighborhood Venues tab. Not tinted by kind (unlike the
          identity tile) -- every venue/POI list in the app renders through this one row.
        </p>
        <div className="max-w-md">
          <PlaceListItem
            href={`/location/${BUSINESS_LOCATION.id}`}
            id={BUSINESS_LOCATION.id}
            name={BUSINESS_LOCATION.name}
            subtitle={BUSINESS_LOCATION.category_name ?? BUSINESS_LOCATION.address ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Summary card</p>
        <p className="text-xs text-muted">
          LocationSummaryCard, as rendered on /location/[id]. Every state (business + POI) lives under Summary
          cards → Location.
        </p>
        <LocationSummaryCard location={BUSINESS_LOCATION} />
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Collected species</p>
        <p className="text-xs text-muted">
          CollectionCard, as rendered on /account&apos;s collection tab once a business has been checked into. Every
          quantity/name variant lives under Components → Collection card.
        </p>
        <div className="grid max-w-md grid-cols-3 gap-4">
          {SPECIES_ENTRIES.map(({ label, entry }) => (
            <div key={entry.id} className="flex flex-col gap-2">
              <p className="text-[10px] text-muted">{label}</p>
              <CollectionCard entry={entry} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Top Caps rank row</p>
        <p className="text-xs text-muted">
          TopCapsSection&apos;s venue-kind row, as rendered on /profile/[username]. ProfileTopCap doesn&apos;t carry a
          business/POI distinction -- this reads identically on the POI entity page.
        </p>
        <div className="max-w-md">
          <TopCapsSection
            topCaps={[{ kind: "venue", id: BUSINESS_LOCATION.id, name: BUSINESS_LOCATION.name, rank: 1, visit_count: 22 }]}
          />
        </div>
      </div>
    </section>
  );
}
