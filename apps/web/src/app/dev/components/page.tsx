import { NeighborRequestButton } from "../../profile/[username]/NeighborRequestButton";
import { ProfileSummaryCard } from "../../account/ProfileSummaryCard";
import { PROFILE_CARDS } from "./demoData";

export default function ProfileCardDemoPage() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
        Profile summary card (ProfileSummaryCard, as rendered on /account)
      </h2>

      <div className="flex flex-col gap-6">
        {PROFILE_CARDS.map(
          ({
            label,
            user,
            favoriteCount,
            checkinCount,
            pointsSummary,
            badgeCount,
            challengeCount,
            neighborCount,
            neighborState,
          }) => (
            <div key={user.id} className="flex flex-col gap-2">
              <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
              <ProfileSummaryCard
                user={user}
                favoriteCount={favoriteCount}
                checkinCount={checkinCount}
                pointsSummary={pointsSummary}
                badgeCount={badgeCount}
                challengeCount={challengeCount}
                neighborCount={neighborCount}
                action={<NeighborRequestButton username={user.username ?? "demo"} mockNeighborState={neighborState} />}
              />
            </div>
          )
        )}
      </div>
    </section>
  );
}
