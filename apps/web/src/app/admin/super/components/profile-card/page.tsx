import { NeighborRequestButton } from "../../../../profile/[username]/NeighborRequestButton";
import { ProfileSummaryCard } from "../../../../account/ProfileSummaryCard";
import { PROFILE_CARDS } from "../demoData";

export default function ProfileCardDemoPage() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Profile card</h1>
        <p className="mt-1 text-sm text-muted">ProfileSummaryCard, as rendered on /account.</p>
      </div>

      <div className="flex flex-col gap-6">
        {PROFILE_CARDS.map(
          ({
            label,
            user,
            collectionCount,
            checkinCount,
            pointsSummary,
            badgeCount,
            challengeCount,
            neighborCount,
            neighborMushrooms,
            neighborState,
          }) => (
            <div key={user.id} className="flex flex-col gap-2">
              <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
              <ProfileSummaryCard
                user={user}
                collectionCount={collectionCount}
                checkinCount={checkinCount}
                pointsSummary={pointsSummary}
                badgeCount={badgeCount}
                challengeCount={challengeCount}
                neighborCount={neighborCount}
                neighborMushrooms={neighborMushrooms}
                action={<NeighborRequestButton username={user.username ?? "demo"} mockNeighborState={neighborState} />}
              />
            </div>
          )
        )}
      </div>
    </section>
  );
}
