"use client";

import { Avatar } from "../../../../../Avatar";
import { AccountMenu } from "../../../../../AccountMenu";
import { ProfileSummaryCard } from "../../../../../account/ProfileSummaryCard";
import { MushroomField } from "../../../../../MushroomField";
import { CollectionCard } from "../../../../../account/(tabs)/collection/page";
import { ActivityFeed } from "../../../../../ActivityFeed";
import { ACTIVITY_CHECKIN, COLLECTION_ENTRIES, PROFILE_CARDS } from "../../demoData";

const PROFILE = PROFILE_CARDS[1];
const SPECIES_ENTRIES = COLLECTION_ENTRIES.filter((e) => e.style === "Connection -- with a neighbor");

// Entity-first view of "user" -- see entities/neighborhood/page.tsx for the
// pattern this follows. A user has no EntityTile/EntityTypeChip (EntityKind
// covers only business/poi/neighborhood) -- Avatar is its identity mark
// instead, and there's no bare list row the way NeighborhoodCard/
// PlaceListItem are for the other entities; the closest equivalents are the
// nav-level AccountMenu chip and the named-visitor pills in a MushroomField's
// Top Caps cluster, both included below.
export default function EntityUserPage() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">User</h1>
        <p className="mt-1 text-sm text-muted">Every representation of a user across the app, side by side.</p>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Avatar</p>
        <p className="text-xs text-muted">
          Avatar -- a deterministic mushroom keyed by user id (or a Google photo, when avatarStyle is
          &quot;social&quot; and one is on file). Never a bare monogram.
        </p>
        <div className="flex items-center gap-4">
          <Avatar avatarUrl={null} avatarStyle="mushroom" seed="demo-entity-user-1" label="Jamie R" size={44} />
          <Avatar avatarUrl={null} avatarStyle="mushroom" seed="demo-entity-user-2" label="Morgan Lee" size={44} />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Nav chip</p>
        <p className="text-xs text-muted">AccountMenu&apos;s pill trigger, as rendered in the site header and every admin shell.</p>
        <div className="w-fit rounded-full bg-nav p-2">
          <AccountMenu user={PROFILE.user} showAdminLink onLogOut={() => {}} />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Summary card</p>
        <p className="text-xs text-muted">
          ProfileSummaryCard, as rendered on /account and /profile/[username]. Every state lives under Summary
          cards → User.
        </p>
        <ProfileSummaryCard
          user={PROFILE.user}
          collectionCount={PROFILE.collectionCount}
          checkinCount={PROFILE.checkinCount}
          pointsSummary={PROFILE.pointsSummary}
          badgeCount={PROFILE.badgeCount}
          challengeCount={PROFILE.challengeCount}
          neighborCount={PROFILE.neighborCount}
          neighborMushrooms={PROFILE.neighborMushrooms}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Top Caps badge cluster</p>
        <p className="text-xs text-muted">
          MushroomField&apos;s named-visitor pills, as rendered on a neighborhood/location summary card -- up to 3
          users named by rank, distinct from the profile owner&apos;s own TopCapsSection rank row (Lists & sections →
          Top
          Caps).
        </p>
        <div className="max-w-md overflow-hidden rounded-2xl bg-card-alt px-5 pt-4 pb-6">
          <MushroomField
            seed="demo-entity-user-field"
            count={6}
            ariaLabel="6 recent visitors"
            distinctMushrooms
            topVisitors={[
              { username: "ravik", displayName: "Ravi K", visitCount: 14 },
              { username: "avap", displayName: "Ava P", visitCount: 6 },
              { username: "samk", displayName: "Sam K", visitCount: 3 },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Collected species</p>
        <p className="text-xs text-muted">
          CollectionCard, as rendered on /account&apos;s collection tab once a neighbor connection has been
          &quot;collected.&quot; Every quantity/name variant lives under Components → Collection card.
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
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Activity feed mention</p>
        <p className="text-xs text-muted">
          ActivityFeed&apos;s actor avatar + name link, as rendered on /location/[id], /neighborhoods/[slug], and
          /account. Full type coverage lives under Lists & sections → Activity feed.
        </p>
        <div className="max-w-md">
          <ActivityFeed items={[ACTIVITY_CHECKIN]} emptyMessage="No activity yet." />
        </div>
      </div>
    </section>
  );
}
