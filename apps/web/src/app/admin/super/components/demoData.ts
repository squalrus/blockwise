import type {
  ActivityItem,
  AppUser,
  Badge,
  CheckinRewardsSummary,
  CompletedChallengeSummary,
  Event,
  MushroomCollectionEntry,
  MushroomConfig,
  NeighborhoodProfile,
  NeighborhoodSummary,
  ProfileTopCap,
  RecentVisitorMushroom,
  TopVisitor,
  UserBadge,
  UserChallenge,
  UserPointsSummary,
  VenueDetail,
} from "@blockwise/types";
import { mushroomConfigForSpecies, mushroomConfigForUser, mushroomSpeciesName } from "@blockwise/types";
import type { NeighborState } from "../../../profile/[username]/NeighborRequestButton";
import type { CheckinStatus } from "../../../useCheckIn";

// Shared fixture data for the /admin/super/components library (see
// layout.tsx) -- one file per component section is easier to scan than one
// long page, but the demo builders/constants below are common enough (NOW,
// badge/rewards helpers) to stay centralized rather than duplicated per tab.

export const NOW = new Date().toISOString();

// BACKLOG.md Ref 94/97 -- deterministic sample mushrooms for the
// neighborhood/location mosaic and profile neighbor-mosaic demo fixtures,
// so /admin/super/components actually previews the recent-visitor mosaic (varied
// sizes by visitCount) and neighbor mosaic instead of rendering empty.
function neighborMushroom(seed: string): MushroomConfig {
  return mushroomConfigForUser(seed);
}

function recentVisitor(seed: string, visitCount: number): RecentVisitorMushroom {
  return { mushroom: mushroomConfigForUser(seed), visitCount };
}

// The named top-N visitors behind a neighborhood/location mosaic's "Top
// Caps" badge cluster -- paired with each badge's own visitCount, ideally
// matching the biggest entries in that same fixture's recentVisitor(...) list.
function topVisitor(username: string, displayName: string | null, visitCount: number): TopVisitor {
  return { username, displayName, visitCount };
}

function badge(overrides: Partial<Badge> & Pick<Badge, "id" | "code" | "name" | "icon">): Badge {
  return { description: null, neighborhood_id: null, ...overrides };
}

const BADGE_LANDMARK_1 = badge({ id: "badge-landmark-1", code: "landmark_hunter_1", name: "Landmark Hunter I", icon: "compass" });
const BADGE_COFFEE_1 = badge({ id: "badge-coffee-1", code: "coffee_explorer_1", name: "Coffee Shop Explorer I", icon: "coffee" });
const BADGE_DAY_5 = badge({ id: "badge-day-5", code: "day_tripper_5", name: "5-Spot Day", icon: "zap" });
const BADGE_LEVEL_2 = badge({ id: "badge-level-2", code: "level_2", name: "Level 2 Forager", icon: "mushroom" });
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

// Venue row + check-in slider states (PlaceListItem, as rendered on /checkin)
export const CHECKIN_STATES: { label: string; status: CheckinStatus }[] = [
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
    account_type: "consumer",
    email: null,
    avatar_url: null,
    avatar_style: "mushroom",
    mushroom_customization: null,
    username: null,
    visibility: "public",
    created_at: NOW,
    is_neighborhood_admin: false,
    is_super_admin: false,
    notification_preferences: {
      checkins: true,
      connection_requests: true,
      connection_accepted: true,
      event_reminders: true,
      new_coupons: true,
    },
    ...overrides,
  };
}

// Profile summary card (ProfileSummaryCard, as rendered on /account)
export const PROFILE_CARDS: {
  label: string;
  user: AppUser;
  collectionCount: number;
  checkinCount: number;
  pointsSummary: UserPointsSummary;
  badgeCount: number;
  challengeCount: number;
  neighborCount: number;
  neighborMushrooms: MushroomConfig[];
  neighborState: NeighborState;
}[] = [
  {
    label: "New forager -- Level 1, just getting started, not connected",
    user: profileUser({ id: "demo-profile-1", display_name: "Jamie R" }),
    collectionCount: 1,
    checkinCount: 0,
    pointsSummary: { points: 5, level: 1, points_into_level: 5, points_to_next_level: 45 },
    badgeCount: 0,
    challengeCount: 0,
    neighborCount: 0,
    neighborMushrooms: [],
    neighborState: "none",
  },
  {
    label: "Level 4 -- matches screenshot, request sent",
    user: profileUser({ id: "demo-profile-2", display_name: "Chad S" }),
    collectionCount: 6,
    checkinCount: 13,
    pointsSummary: { points: 160, level: 4, points_into_level: 60, points_to_next_level: 40 },
    badgeCount: 3,
    challengeCount: 1,
    neighborCount: 4,
    // BACKLOG.md Ref 97: one live mushroom per accepted neighbor.
    neighborMushrooms: ["a", "b", "c", "d"].map((s) => neighborMushroom(`demo-neighbor-${s}`)),
    neighborState: "outgoing",
  },
  {
    label: "Level 9 -- heavy activity, near level-up, incoming request",
    user: profileUser({ id: "demo-profile-3", display_name: "Morgan Lee" }),
    collectionCount: 22,
    checkinCount: 87,
    pointsSummary: { points: 940, level: 9, points_into_level: 90, points_to_next_level: 10 },
    badgeCount: 11,
    challengeCount: 6,
    neighborCount: 19,
    neighborMushrooms: Array.from({ length: 19 }, (_, i) => neighborMushroom(`demo-neighbor-heavy-${i}`)),
    neighborState: "incoming",
  },
  {
    label: "Long display name -- wrapping/truncation check, already neighbors",
    user: profileUser({ id: "demo-profile-4", display_name: "Alexandria Montgomery-Whitfield" }),
    collectionCount: 3,
    checkinCount: 2,
    pointsSummary: { points: 25, level: 2, points_into_level: 5, points_to_next_level: 45 },
    badgeCount: 1,
    challengeCount: 0,
    neighborCount: 1,
    neighborMushrooms: [neighborMushroom("demo-neighbor-solo")],
    neighborState: "accepted",
  },
];

function neighborhood(overrides: Partial<NeighborhoodProfile> & Pick<NeighborhoodProfile, "id" | "name" | "slug">): NeighborhoodProfile {
  return {
    description: null,
    city: "Seattle",
    state: "WA",
    pois: [],
    social_links: {},
    venue_count: 0,
    poi_count: 0,
    member_count: 0,
    checkin_count: 0,
    recent_checkin_mushrooms: [],
    top_visitors: [],
    top_venues: [],
    ...overrides,
  };
}

// Neighborhood summary card (NeighborhoodSummaryCard, as rendered on /neighborhoods/[slug])
export const NEIGHBORHOOD_CARDS: { label: string; neighborhood: NeighborhoodProfile; joined: boolean }[] = [
  {
    label: "Full stats, description, and social links -- not joined",
    neighborhood: neighborhood({
      id: "demo-neighborhood-1",
      name: "Greenwood",
      slug: "greenwood",
      description: "A walkable pocket of North Seattle known for antique shops, brewpubs, and a lively weekend market.",
      venue_count: 42,
      poi_count: 11,
      member_count: 318,
      checkin_count: 1204,
      social_links: { instagram: "https://instagram.com/greenwoodseattle", website: "https://greenwoodseattle.com" },
      // BACKLOG.md Ref 94: a mosaic mixing repeat "Mayor" visitors (larger,
      // sqrt-scaled) with one-time visitors (base size) within the 60-day
      // window, most-visits-first.
      recent_checkin_mushrooms: [
        recentVisitor("demo-visitor-1", 14),
        recentVisitor("demo-visitor-2", 6),
        recentVisitor("demo-visitor-3", 3),
        recentVisitor("demo-visitor-4", 1),
        recentVisitor("demo-visitor-5", 1),
        recentVisitor("demo-visitor-6", 1),
      ],
      // BACKLOG.md Ref 94/101 "Top Caps" badge cluster: top 3 by visitCount,
      // matching the mosaic entries above.
      top_visitors: [
        topVisitor("ravik", "Ravi K", 14),
        topVisitor("avap", "Ava P", 6),
        topVisitor("samk", "Sam K", 3),
      ],
    }),
    joined: false,
  },
  {
    label: "No description, no social links -- new/sparse neighborhood, joined",
    neighborhood: neighborhood({
      id: "demo-neighborhood-2",
      name: "Ballard",
      slug: "ballard",
      venue_count: 3,
      poi_count: 1,
      member_count: 5,
      checkin_count: 2,
      // Sparse case: two distinct one-time visitors, both base size.
      recent_checkin_mushrooms: [recentVisitor("demo-visitor-14", 1), recentVisitor("demo-visitor-15", 1)],
    }),
    joined: true,
  },
];

function venueDetail(overrides: Partial<VenueDetail> & Pick<VenueDetail, "id" | "name" | "kind">): VenueDetail {
  return {
    google_place_id: null,
    description: null,
    address: "9057 Greenwood Ave N, Seattle, WA 98103, USA",
    lat: 47.6896,
    lng: -122.3553,
    category_name: null,
    claimed_by_business: false,
    enrichment: null,
    checkin_count: 0,
    favorite_count: 0,
    neighborhood_slug: "greenwood",
    neighborhood_name: "Greenwood",
    social_links: {},
    recent_checkin_mushrooms: [],
    top_visitors: [],
    open_status: null,
    ...overrides,
  };
}

// Location summary card (LocationSummaryCard, as rendered on /location/[id])
export const LOCATION_CARDS: { label: string; location: VenueDetail; favorited: boolean }[] = [
  {
    label: "Business -- claimed, rated, with social links, heavy check-in history, favorited",
    location: venueDetail({
      id: "demo-location-1",
      name: "Wilson Tax And Accounting",
      kind: "business",
      category_name: "Accounting & Tax",
      claimed_by_business: true,
      checkin_count: 512,
      favorite_count: 89,
      // BACKLOG.md Ref 94: heavy check-in history -- a "Mayor" mosaic mixing
      // a few frequent regulars with several one-time visitors.
      recent_checkin_mushrooms: [
        recentVisitor("demo-visitor-7", 22),
        recentVisitor("demo-visitor-8", 9),
        recentVisitor("demo-visitor-9", 2),
        recentVisitor("demo-visitor-10", 1),
        recentVisitor("demo-visitor-11", 1),
      ],
      // Long display name, to check the badge's truncation.
      top_visitors: [topVisitor("alexandriamw", "Alexandria Montgomery-Whitfield", 22)],
      // "Closed" state, to check the pill reads correctly either way.
      open_status: { open: false, time: "9 AM" },
      enrichment: {
        venue_id: "demo-location-1",
        source: "google",
        rating: 4.7,
        reviews: [],
        price_tier: null,
        photo_refs: [],
        phone: null,
        website: null,
        hours: null,
        editorial_summary: null,
        atmosphere: null,
        fetched_at: NOW,
      },
      social_links: { instagram: "https://instagram.com/wilsontax", website: "https://wilsontax.example.com" },
    }),
    favorited: true,
  },
  {
    label: "Business -- unclaimed, no rating, no check-ins yet, not favorited",
    location: venueDetail({
      id: "demo-location-2",
      name: "Corner Cafe",
      kind: "business",
      category_name: "Coffee & Tea",
    }),
    favorited: false,
  },
  {
    label: "POI -- with description and check-in count, favorited",
    location: venueDetail({
      id: "demo-location-3",
      name: "Greenwood Water Tower",
      kind: "poi",
      description: "A century-old water tower turned neighborhood landmark, visible from most of Greenwood.",
      checkin_count: 86,
      favorite_count: 14,
      recent_checkin_mushrooms: [recentVisitor("demo-visitor-12", 4), recentVisitor("demo-visitor-13", 1)],
    }),
    favorited: true,
  },
];

function collectionEntry(
  overrides: Partial<MushroomCollectionEntry> & Pick<MushroomCollectionEntry, "id" | "source_type" | "source_id" | "source_name">
): MushroomCollectionEntry {
  return {
    source_slug: null,
    location_kind: null,
    species_name: mushroomSpeciesName(overrides.source_id),
    mushroom: mushroomConfigForSpecies(overrides.source_id),
    quantity: 1,
    first_collected_at: NOW,
    revealed: true,
    ...overrides,
  };
}

// Collection card (CollectionCard, as rendered on /account's collection tab)
// -- three variants per source_type/location_kind style (the five styles
// cardKindForEntry resolves to, entityKind.ts), varying quantity (no badge /
// small badge / double-digit badge) and source-name length (short vs long,
// to check the bottom mono label's truncation) rather than one example each.
export const COLLECTION_ENTRIES: { style: string; label: string; entry: MushroomCollectionEntry }[] = [
  {
    style: "Checkin -- business",
    label: "1x -- no qty badge",
    entry: collectionEntry({
      id: "demo-collection-business-1",
      source_type: "checkin",
      source_id: "demo-species-business-1",
      source_name: "Uma Clinic",
      location_kind: "business",
      quantity: 1,
    }),
  },
  {
    style: "Checkin -- business",
    label: "6x",
    entry: collectionEntry({
      id: "demo-collection-business-2",
      source_type: "checkin",
      source_id: "demo-species-business-2",
      source_name: "Corner Cafe",
      location_kind: "business",
      quantity: 6,
    }),
  },
  {
    style: "Checkin -- business",
    label: "23x -- long venue name",
    entry: collectionEntry({
      id: "demo-collection-business-3",
      source_type: "checkin",
      source_id: "demo-species-business-3",
      source_name: "Wilson Tax And Accounting",
      location_kind: "business",
      quantity: 23,
    }),
  },
  {
    style: "Checkin -- point of interest",
    label: "1x -- no qty badge",
    entry: collectionEntry({
      id: "demo-collection-poi-1",
      source_type: "checkin",
      source_id: "demo-species-poi-1",
      source_name: "Phinney Station",
      location_kind: "poi",
      quantity: 1,
    }),
  },
  {
    style: "Checkin -- point of interest",
    label: "8x",
    entry: collectionEntry({
      id: "demo-collection-poi-2",
      source_type: "checkin",
      source_id: "demo-species-poi-2",
      source_name: "Greenwood Water Tower",
      location_kind: "poi",
      quantity: 8,
    }),
  },
  {
    style: "Checkin -- point of interest",
    label: "19x -- long POI name",
    entry: collectionEntry({
      id: "demo-collection-poi-3",
      source_type: "checkin",
      source_id: "demo-species-poi-3",
      source_name: "Golden Gardens Park Viewpoint",
      location_kind: "poi",
      quantity: 19,
    }),
  },
  {
    style: "Neighborhood",
    label: "1x -- no qty badge",
    entry: collectionEntry({
      id: "demo-collection-neighborhood-1",
      source_type: "neighborhood",
      source_id: "demo-species-neighborhood-1",
      source_name: "Ballard",
      source_slug: "ballard",
      quantity: 1,
    }),
  },
  {
    style: "Neighborhood",
    label: "5x",
    entry: collectionEntry({
      id: "demo-collection-neighborhood-2",
      source_type: "neighborhood",
      source_id: "demo-species-neighborhood-2",
      source_name: "Greenwood",
      source_slug: "greenwood",
      quantity: 5,
    }),
  },
  {
    style: "Neighborhood",
    label: "14x -- long name",
    entry: collectionEntry({
      id: "demo-collection-neighborhood-3",
      source_type: "neighborhood",
      source_id: "demo-species-neighborhood-3",
      source_name: "Maple Leaf-Roosevelt",
      source_slug: "maple-leaf-roosevelt",
      quantity: 14,
    }),
  },
  {
    style: "Connection -- with a neighbor",
    label: "1x -- no qty badge",
    entry: collectionEntry({
      id: "demo-collection-connection-1",
      source_type: "connection",
      source_id: "demo-species-connection-1",
      source_name: "Sam K",
      source_slug: "samk",
      quantity: 1,
    }),
  },
  {
    style: "Connection -- with a neighbor",
    label: "3x",
    entry: collectionEntry({
      id: "demo-collection-connection-2",
      source_type: "connection",
      source_id: "demo-species-connection-2",
      source_name: "Morgan Lee",
      source_slug: "morganlee",
      quantity: 3,
    }),
  },
  {
    style: "Connection -- with a neighbor",
    label: "9x -- long display name",
    entry: collectionEntry({
      id: "demo-collection-connection-3",
      source_type: "connection",
      source_id: "demo-species-connection-3",
      source_name: "Alexandria Montgomery-Whitfield",
      source_slug: "alexandriamw",
      quantity: 9,
    }),
  },
  {
    style: "Checkin -- legacy row, venue kind unresolved (no ring/chip)",
    label: "1x -- no qty badge",
    entry: collectionEntry({
      id: "demo-collection-legacy-1",
      source_type: "checkin",
      source_id: "demo-species-legacy-1",
      source_name: "Old Venue",
      location_kind: null,
      quantity: 1,
    }),
  },
  {
    style: "Checkin -- legacy row, venue kind unresolved (no ring/chip)",
    label: "4x",
    entry: collectionEntry({
      id: "demo-collection-legacy-2",
      source_type: "checkin",
      source_id: "demo-species-legacy-2",
      source_name: "Renamed Venue",
      location_kind: null,
      quantity: 4,
    }),
  },
  {
    style: "Checkin -- legacy row, venue kind unresolved (no ring/chip)",
    label: "11x -- long venue name",
    entry: collectionEntry({
      id: "demo-collection-legacy-3",
      source_type: "checkin",
      source_id: "demo-species-legacy-3",
      source_name: "Deleted Business Location",
      location_kind: null,
      quantity: 11,
    }),
  },
];

function userBadge(b: Badge, awardedAt: string = NOW): UserBadge {
  return { badge: b, awarded_at: awardedAt };
}

// Badges section (BadgesSection, as rendered on /profile/[username]) --
// empty (renders a plain message, not null, unlike TopCapsSection below),
// a handful, and enough to trigger the "Show N more" pagination footer.
export const USER_BADGES: { label: string; badges: UserBadge[] }[] = [
  { label: "Empty", badges: [] },
  {
    label: "A few",
    badges: [
      userBadge(BADGE_COFFEE_1, new Date(Date.now() - 2 * 86400000).toISOString()),
      userBadge(BADGE_LANDMARK_1, new Date(Date.now() - 9 * 86400000).toISOString()),
      userBadge(BADGE_DAY_5, new Date(Date.now() - 30 * 86400000).toISOString()),
    ],
  },
  {
    label: 'Many -- triggers "Show more"',
    badges: Array.from({ length: 15 }, (_, i) =>
      userBadge(
        badge({
          id: `badge-many-${i}`,
          code: `many_${i}`,
          name: `Badge ${i + 1}`,
          icon: ["coffee", "compass", "star", "zap", "mushroom"][i % 5],
        }),
        new Date(Date.now() - i * 86400000).toISOString()
      )
    ),
  },
];

function userChallenge(
  overrides: Partial<UserChallenge> & Pick<UserChallenge, "id" | "title">
): UserChallenge {
  return {
    description: null,
    neighborhood_id: "demo-neighborhood",
    neighborhood_name: "Greenwood",
    points_reward: 50,
    badge: null,
    completed_at: NOW,
    ...overrides,
  };
}

// Challenges section (ChallengesSection, as rendered on /profile/[username])
// -- same empty/few/many-with-pagination shape as USER_BADGES above.
export const USER_CHALLENGES: { label: string; challenges: UserChallenge[] }[] = [
  { label: "Empty", challenges: [] },
  {
    label: "A few",
    challenges: [
      userChallenge({
        id: "challenge-coffee-crawl",
        title: "Coffee Crawl",
        description: "Check in to 5 different coffee shops.",
        neighborhood_name: "Greenwood",
        points_reward: 50,
        badge: COFFEE_CRAWL_CHALLENGE.badge,
        completed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      }),
      userChallenge({
        id: "challenge-weekend-wanderer",
        title: "Weekend Wanderer",
        neighborhood_name: "Ballard",
        points_reward: 30,
        completed_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      }),
    ],
  },
  {
    label: 'Many -- triggers "Show more"',
    challenges: Array.from({ length: 12 }, (_, i) =>
      userChallenge({
        id: `challenge-many-${i}`,
        title: `Challenge ${i + 1}`,
        neighborhood_name: "Greenwood",
        points_reward: 25 + i,
        completed_at: new Date(Date.now() - i * 86400000).toISOString(),
      })
    ),
  },
];

function activityItem(
  overrides: Partial<ActivityItem> & Pick<ActivityItem, "id" | "type" | "actor_name" | "occurred_at">
): ActivityItem {
  return {
    actor_username: null,
    actor_mushroom_customization: null,
    venue_id: null,
    venue_name: null,
    location_kind: null,
    badge_name: null,
    badge_icon: null,
    challenge_title: null,
    event_id: null,
    event_title: null,
    other_user_name: null,
    other_user_username: null,
    other_user_mushroom_customization: null,
    points_earned: null,
    ...overrides,
  };
}

export const ACTIVITY_CHECKIN = activityItem({
  id: "activity-checkin",
  type: "checkin",
  actor_name: "Ava P",
  actor_username: "avap",
  venue_id: "demo-sample-location",
  venue_name: "Diesel Fuel Coffee",
  location_kind: "business",
  points_earned: 10,
  occurred_at: new Date(Date.now() - 2 * 3600000).toISOString(),
});

const ACTIVITY_FAVORITE = activityItem({
  id: "activity-favorite",
  type: "favorite",
  actor_name: "Sam K",
  actor_username: "samk",
  venue_id: "demo-sample-poi",
  venue_name: "Greenwood Water Tower",
  location_kind: "poi",
  occurred_at: new Date(Date.now() - 26 * 3600000).toISOString(),
});

const ACTIVITY_BADGE = activityItem({
  id: "activity-badge",
  type: "badge",
  actor_name: "A user",
  badge_name: "Coffee Shop Explorer I",
  badge_icon: "coffee",
  occurred_at: new Date(Date.now() - 5 * 3600000).toISOString(),
});

const ACTIVITY_CHALLENGE = activityItem({
  id: "activity-challenge",
  type: "challenge_completion",
  actor_name: "Morgan Lee",
  actor_username: "morganlee",
  challenge_title: "Coffee Crawl",
  points_earned: 50,
  occurred_at: new Date(Date.now() - 8 * 3600000).toISOString(),
});

export const ACTIVITY_EVENT_FOLLOW = activityItem({
  id: "activity-event-follow",
  type: "event_follow",
  actor_name: "Priya N",
  actor_username: "priyan",
  event_id: "demo-event-1",
  event_title: "Latte Art Throwdown",
  occurred_at: new Date(Date.now() - 27 * 3600000).toISOString(),
});

const ACTIVITY_CONNECTION = activityItem({
  id: "activity-connection",
  type: "neighbor_connection",
  actor_name: "Owen D",
  actor_username: "owend",
  other_user_name: "Ava P",
  other_user_username: "avap",
  points_earned: 15,
  occurred_at: new Date(Date.now() - 50 * 3600000).toISOString(),
});

// A checkin predating the location_kind column (ActivityItem's own doc
// comment) -- ActorAvatar falls back to a plain single avatar, no overlap,
// the same "untyped fallback" CollectionCard's legacy style already covers.
const ACTIVITY_CHECKIN_LEGACY = activityItem({
  id: "activity-checkin-legacy",
  type: "checkin",
  actor_name: "Jamie R",
  actor_username: "jamier",
  venue_id: "demo-legacy-venue",
  venue_name: "Old Venue",
  points_earned: 10,
  occurred_at: new Date(Date.now() - 60 * 3600000).toISOString(),
});

// Activity feed (ActivityFeed, as rendered on /location/[id], /neighborhoods/
// [slug]'s Spore Feed tab, and /account's Spore Feed + My Activity tabs) --
// empty, one row per ActivityType in isolation (so each Description branch
// and its own field combination -- e.g. "badge" has no venue, "favorite" has
// no points -- can be checked on its own), and a combined view spreading all
// six across "Today"/"Yesterday" day-label groups the way a real feed mixes
// them.
export const ACTIVITY_FEED_STATES: { label: string; items: ActivityItem[] }[] = [
  { label: "Empty", items: [] },
  { label: "checkin", items: [ACTIVITY_CHECKIN] },
  { label: "checkin -- legacy, no location_kind (no overlap)", items: [ACTIVITY_CHECKIN_LEGACY] },
  { label: "favorite", items: [ACTIVITY_FAVORITE] },
  { label: "badge", items: [ACTIVITY_BADGE] },
  { label: "challenge_completion", items: [ACTIVITY_CHALLENGE] },
  { label: "event_follow", items: [ACTIVITY_EVENT_FOLLOW] },
  { label: "neighbor_connection", items: [ACTIVITY_CONNECTION] },
  {
    label: "Mixed types, multiple days",
    items: [
      ACTIVITY_CHECKIN,
      ACTIVITY_BADGE,
      ACTIVITY_CHALLENGE,
      ACTIVITY_FAVORITE,
      ACTIVITY_EVENT_FOLLOW,
      ACTIVITY_CONNECTION,
    ],
  },
];

function event(overrides: Partial<Event> & Pick<Event, "id" | "title" | "start_time" | "end_time">): Event {
  return {
    venue_id: null,
    neighborhood_id: "demo-neighborhood",
    venue_name: null,
    description: "",
    created_at: NOW,
    source: "manual",
    location: null,
    status: "active",
    ...overrides,
  };
}

// Event row (EventListItem + FollowEventButton, as rendered on
// /location/:id/events and /neighborhoods/:slug's Upcoming events tab) --
// manual vs. feed-synced source pill, a hidden row, and a long title to
// check wrapping/truncation.
export const SAMPLE_EVENTS: { label: string; event: Event; mockFollowing: boolean }[] = [
  {
    label: "Manual, with venue + location",
    event: event({
      id: "demo-event-1",
      title: "Latte Art Throwdown",
      description: "Local baristas compete for bragging rights -- free samples all night.",
      start_time: new Date(Date.now() + 3 * 86400000).toISOString(),
      end_time: new Date(Date.now() + 3 * 86400000 + 3 * 3600000).toISOString(),
      venue_name: "Diesel Fuel Coffee",
      location: "9057 Greenwood Ave N",
      source: "manual",
    }),
    mockFollowing: false,
  },
  {
    label: "Feed-synced (iCal), no venue",
    event: event({
      id: "demo-event-2",
      title: "Greenwood Night Market",
      description: "Local vendors, live music, and food trucks along Greenwood Ave.",
      start_time: new Date(Date.now() + 86400000).toISOString(),
      end_time: new Date(Date.now() + 86400000 + 4 * 3600000).toISOString(),
      source: "ical",
    }),
    mockFollowing: true,
  },
  {
    label: "Hidden, long title wrap check",
    event: event({
      id: "demo-event-3",
      title: "Second Saturday Neighborhood Cleanup & Community Potluck",
      description: "Bring gloves and an appetite.",
      start_time: new Date(Date.now() + 10 * 86400000).toISOString(),
      end_time: new Date(Date.now() + 10 * 86400000 + 2 * 3600000).toISOString(),
      source: "manual",
      status: "hidden",
    }),
    mockFollowing: false,
  },
];

// Top Caps section (TopCapsSection, as rendered on /profile/[username]) --
// renders null for an empty list (unlike Badges/Challenges above), one cap,
// and a full rank-1/2/3 set mixing venue and neighborhood kinds.
export const TOP_CAPS_STATES: { label: string; topCaps: ProfileTopCap[] }[] = [
  { label: "None (renders nothing)", topCaps: [] },
  {
    label: "One cap",
    topCaps: [{ kind: "venue", id: "demo-sample-location", name: "Diesel Fuel Coffee", rank: 1, visit_count: 14 }],
  },
  {
    label: "Three caps, mixed venue/neighborhood",
    topCaps: [
      { kind: "venue", id: "demo-sample-location", name: "Diesel Fuel Coffee", rank: 1, visit_count: 22 },
      {
        kind: "neighborhood",
        id: "demo-sample-neighborhood",
        slug: "greenwood-sample",
        name: "Greenwood",
        rank: 2,
        visit_count: 14,
      },
      { kind: "venue", id: "demo-sample-poi", name: "Golden Gardens Park Viewpoint", rank: 3, visit_count: 9 },
    ],
  },
];

// Entities: neighborhood (admin/super/components/entities/neighborhood/
// page.tsx) -- every place a neighborhood shows up as a UI element, gathered
// entity-first instead of scattered across the Summary cards/Components/
// Lists & sections pages above. Only the /neighborhoods index row
// (NeighborhoodCard) needs its own fixture here; the identity tile, summary
// card, collected-species card, and Top Caps row all reuse NEIGHBORHOOD_CARDS
// / COLLECTION_ENTRIES / a one-off ProfileTopCap defined inline on that page.
export const ENTITY_NEIGHBORHOOD_SUMMARIES: { neighborhood: NeighborhoodSummary }[] = [
  {
    neighborhood: {
      id: "demo-entity-neighborhood-1",
      name: "Greenwood",
      slug: "greenwood",
      city: "Seattle",
      state: "WA",
      joined: true,
      business_count: 42,
      member_count: 318,
    },
  },
  {
    neighborhood: {
      id: "demo-entity-neighborhood-2",
      name: "Ballard",
      slug: "ballard",
      city: "Seattle",
      state: "WA",
      joined: false,
      business_count: 3,
      member_count: 5,
    },
  },
];
