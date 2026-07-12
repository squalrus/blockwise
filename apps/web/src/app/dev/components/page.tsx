import type { AppUser, Badge, CheckinRewardsSummary, CompletedChallengeSummary, UserPointsSummary } from "@blockwise/types";
import { PlaceListItem } from "../../PlaceListItem";
import type { CheckinStatus } from "../../useCheckIn";
import { SlideToCheckIn } from "../../SlideToCheckIn";
import { ProfileSummaryCard } from "../../account/ProfileSummaryCard";

// Internal component library -- not linked from any nav, reachable only by
// knowing the URL. Renders the *exact* components/rows real pages use (e.g.
// PlaceListItem with its `action` slot, the same row NearestVenues renders on
// /checkin) rather than an approximation, so sizing matches the app exactly
// -- no extra grid/wrapper narrower than production. Each card is still
// fully draggable (SlideToCheckIn's dev-only mockResolution prop only swaps
// the network call for a canned outcome once the slide completes), so every
// state can be reviewed by actually sliding rather than loading pre-flipped.
// Add a new section here whenever a component grows a new visual state
// worth reviewing in isolation.

function badge(overrides: Partial<Badge> & Pick<Badge, "id" | "code" | "name" | "icon">): Badge {
  return { description: null, ...overrides };
}

const BADGE_LANDMARK_1 = badge({ id: "badge-landmark-1", code: "landmark_hunter_1", name: "Landmark Hunter I", icon: "compass" });
const BADGE_COFFEE_1 = badge({ id: "badge-coffee-1", code: "coffee_explorer_1", name: "Coffee Shop Explorer I", icon: "coffee" });
const BADGE_DAY_5 = badge({ id: "badge-day-5", code: "day_tripper_5", name: "5-Spot Day", icon: "zap" });
const BADGE_LEVEL_2 = badge({ id: "badge-level-2", code: "level_2", name: "Level 2 Forager", icon: "star" });
const BADGE_BACK_FOR_SECONDS = badge({ id: "badge-seconds", code: "back_for_seconds", name: "Back for Seconds", icon: "repeat" });

const COFFEE_CRAWL_CHALLENGE: CompletedChallengeSummary = {
  id: "challenge-coffee-crawl",
  title: "Coffee Crawl",
  points_reward: 50,
  badge: badge({ id: "badge-coffee-crawler", code: "coffee_crawler", name: "Coffee Crawler", icon: "coffee" }),
};

function rewards(overrides: Partial<CheckinRewardsSummary>): CheckinRewardsSummary {
  return { points_earned: 10, challenges_completed: [], badges_earned: [], ...overrides };
}

const NOW = new Date().toISOString();

const STATES: { label: string; status: CheckinStatus }[] = [
  {
    label: "Too far",
    status: { state: "too_far", distanceMeters: 340 },
  },
  {
    label: "API failed",
    status: { state: "error", message: "Something went wrong on our end. Please try again." },
  },
  {
    label: "Success — no badges",
    status: { state: "success", checkedInAt: NOW, rewards: rewards({}) },
  },
  {
    label: "Success — 1 badge",
    status: { state: "success", checkedInAt: NOW, rewards: rewards({ badges_earned: [BADGE_LANDMARK_1] }) },
  },
  {
    label: "Success — 4 badges",
    status: {
      state: "success",
      checkedInAt: NOW,
      rewards: rewards({ badges_earned: [BADGE_COFFEE_1, BADGE_LANDMARK_1, BADGE_DAY_5, BADGE_LEVEL_2] }),
    },
  },
  {
    label: "Success — challenge complete",
    status: {
      state: "success",
      checkedInAt: NOW,
      rewards: rewards({ points_earned: 60, challenges_completed: [COFFEE_CRAWL_CHALLENGE] }),
    },
  },
  {
    label: "Success — challenge complete + 2 badges",
    status: {
      state: "success",
      checkedInAt: NOW,
      rewards: rewards({
        points_earned: 60,
        challenges_completed: [COFFEE_CRAWL_CHALLENGE],
        badges_earned: [BADGE_DAY_5, BADGE_BACK_FOR_SECONDS],
      }),
    },
  },
];

function profileUser(overrides: Partial<AppUser> & Pick<AppUser, "id" | "display_name">): AppUser {
  return {
    is_anonymous: false,
    account_type: "consumer",
    email: null,
    phone: null,
    avatar_url: null,
    avatar_style: "mushroom",
    username: null,
    visibility: "public",
    created_at: NOW,
    is_neighborhood_admin: false,
    ...overrides,
  };
}

const PROFILE_CARDS: {
  label: string;
  user: AppUser;
  favoriteCount: number;
  checkinCount: number;
  pointsSummary: UserPointsSummary;
  badgeCount: number;
  challengeCount: number;
}[] = [
  {
    label: "New forager -- Level 1, just getting started",
    user: profileUser({ id: "demo-profile-1", display_name: "Jamie R" }),
    favoriteCount: 1,
    checkinCount: 0,
    pointsSummary: { points: 5, level: 1, points_into_level: 5, points_to_next_level: 45 },
    badgeCount: 0,
    challengeCount: 0,
  },
  {
    label: "Level 4 -- matches screenshot",
    user: profileUser({ id: "demo-profile-2", display_name: "Chad S" }),
    favoriteCount: 6,
    checkinCount: 13,
    pointsSummary: { points: 160, level: 4, points_into_level: 60, points_to_next_level: 40 },
    badgeCount: 3,
    challengeCount: 1,
  },
  {
    label: "Level 9 -- heavy activity, near level-up",
    user: profileUser({ id: "demo-profile-3", display_name: "Morgan Lee" }),
    favoriteCount: 22,
    checkinCount: 87,
    pointsSummary: { points: 940, level: 9, points_into_level: 90, points_to_next_level: 10 },
    badgeCount: 11,
    challengeCount: 6,
  },
  {
    label: "Long display name -- wrapping/truncation check",
    user: profileUser({ id: "demo-profile-4", display_name: "Alexandria Montgomery-Whitfield" }),
    favoriteCount: 3,
    checkinCount: 2,
    pointsSummary: { points: 25, level: 2, points_into_level: 5, points_to_next_level: 45 },
    badgeCount: 1,
    challengeCount: 0,
  },
];

export default function ComponentLibraryPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-4 font-sans sm:p-16">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Component library</h1>
        <p className="mt-1 text-sm text-muted">
          Internal reference only -- not linked from any nav. Pins components to specific states for review.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
          Profile summary card (ProfileSummaryCard, as rendered on /account)
        </h2>

        <div className="flex flex-col gap-6">
          {PROFILE_CARDS.map(({ label, user, favoriteCount, checkinCount, pointsSummary, badgeCount, challengeCount }) => (
            <div key={user.id} className="flex flex-col gap-2">
              <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
              <ProfileSummaryCard
                user={user}
                favoriteCount={favoriteCount}
                checkinCount={checkinCount}
                pointsSummary={pointsSummary}
                badgeCount={badgeCount}
                challengeCount={challengeCount}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
          Venue row + check-in slider (PlaceListItem, as rendered on /checkin)
        </h2>

        {/* One PlaceListItem per state -- the exact same row/action-slot
            component NearestVenues renders, at its real full width, rather
            than a bespoke wrapper that could drift out of sync with it. */}
        <div className="flex flex-col gap-6">
          {STATES.map(({ label, status }, index) => (
            <div key={label} className="flex flex-col gap-2">
              <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
              <PlaceListItem
                href="/dev/components"
                id={`demo-venue-${index}`}
                name="Wilson Tax And Accounting"
                subtitle="Accounting & Tax · 9057 Greenwood Ave N c206, Seattle, WA 98103, USA"
                action={<SlideToCheckIn locationId={`demo-venue-${index}`} mockResolution={status} />}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
