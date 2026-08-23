import type {
  ActivityItem,
  AppUser,
  Badge,
  CheckinRewardsSummary,
  CompletedChallengeSummary,
  Event,
  MushroomConfig,
  NeighborhoodProfile,
  OpenNowLocation,
  PublicUserProfile,
  RecentVisitorMushroom,
  TopVisitor,
  UserPointsSummary,
  VenueDetail,
} from "@blockwise/types";
import { mushroomConfigForUser } from "@blockwise/types";
import type { NeighborState } from "../../profile/[username]/NeighborRequestButton";
import type { CheckinStatus } from "../../useCheckIn";

// Shared fixture data for the /dev/components component library (see
// layout.tsx) -- one file per component section is easier to scan than one
// long page, but the demo builders/constants below are common enough (NOW,
// badge/rewards helpers) to stay centralized rather than duplicated per tab.

export const NOW = new Date().toISOString();

// BACKLOG.md Ref 94/97 -- deterministic sample mushrooms for the
// neighborhood/location mosaic and profile neighbor-mosaic demo fixtures,
// so /dev/components actually previews the recent-visitor mosaic (varied
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
  return { description: null, ...overrides };
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

// Sample full location page (business kind, as rendered on /location/[id])
export const SAMPLE_BUSINESS_LOCATION: VenueDetail = venueDetail({
  id: "demo-sample-location",
  name: "Diesel Fuel Coffee",
  kind: "business",
  category_name: "Coffee & Tea",
  claimed_by_business: true,
  checkin_count: 341,
  favorite_count: 58,
  recent_checkin_mushrooms: [
    recentVisitor("demo-sample-location-visitor-1", 17),
    recentVisitor("demo-sample-location-visitor-2", 6),
    recentVisitor("demo-sample-location-visitor-3", 3),
    recentVisitor("demo-sample-location-visitor-4", 1),
  ],
  top_visitors: [
    topVisitor("avap", "Ava P", 17),
    topVisitor("marcust", "Marcus T", 6),
    topVisitor("samk", "Sam K", 3),
  ],
  open_status: { open: true, time: "6 PM" },
  social_links: {
    instagram: "https://instagram.com/dieselfuelcoffee",
    website: "https://dieselfuelcoffee.example.com",
  },
  enrichment: {
    venue_id: "demo-sample-location",
    source: "google",
    rating: 4.6,
    reviews: [
      {
        rating: 5,
        text: "Great espresso and a cozy spot to work.",
        author_name: "Ava P",
        published_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        rating: 4,
        text: "Friendly staff, gets crowded on weekends.",
        author_name: "Marcus T",
        published_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        rating: 5,
        text: "Best oat milk latte in Greenwood.",
        author_name: "Sam K",
        published_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      },
    ],
    price_tier: "PRICE_LEVEL_MODERATE",
    photo_refs: [],
    phone: "(206) 555-0100",
    website: "https://dieselfuelcoffee.example.com",
    hours: [
      "Monday: 6:00 AM – 6:00 PM",
      "Tuesday: 6:00 AM – 6:00 PM",
      "Wednesday: 6:00 AM – 6:00 PM",
      "Thursday: 6:00 AM – 6:00 PM",
      "Friday: 6:00 AM – 7:00 PM",
      "Saturday: 7:00 AM – 7:00 PM",
      "Sunday: 7:00 AM – 5:00 PM",
    ],
    editorial_summary: "Neighborhood coffee shop known for single-origin pour-overs and a laptop-friendly back room.",
    atmosphere: {
      delivery: false,
      dine_in: true,
      takeout: true,
      outdoor_seating: true,
      good_for_children: true,
      reservable: false,
    },
    fetched_at: NOW,
  },
});

export const SAMPLE_LOCATION_EVENTS: Event[] = [
  {
    id: "demo-location-event-1",
    venue_id: "demo-sample-location",
    neighborhood_id: null,
    venue_name: null,
    title: "Latte Art Throwdown",
    description: "Local baristas compete for bragging rights -- free samples all night.",
    start_time: new Date(Date.now() + 3 * 86400000).toISOString(),
    end_time: new Date(Date.now() + 3 * 86400000 + 3 * 3600000).toISOString(),
    created_at: NOW,
    source: "manual",
    location: null,
    status: "active",
  },
];

// Location detail page's Spore Feed tab (BACKLOG.md Ref 101 redesign) --
// this venue's own check-ins, newest first.
export const SAMPLE_LOCATION_ACTIVITY: ActivityItem[] = [
  {
    id: "demo-location-activity-1",
    type: "checkin",
    actor_name: "Ava P",
    actor_username: "avap",
    venue_id: "demo-sample-location",
    venue_name: "Diesel Fuel Coffee",
    badge_name: null,
    badge_icon: null,
    challenge_title: null,
    event_id: null,
    event_title: null,
    other_user_name: null,
    other_user_username: null,
    occurred_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "demo-location-activity-2",
    type: "checkin",
    actor_name: "A user",
    actor_username: null,
    venue_id: "demo-sample-location",
    venue_name: "Diesel Fuel Coffee",
    badge_name: null,
    badge_icon: null,
    challenge_title: null,
    event_id: null,
    event_title: null,
    other_user_name: null,
    other_user_username: null,
    occurred_at: new Date(Date.now() - 26 * 3600000).toISOString(),
  },
];

// Location detail page's Leaderboard tab (BACKLOG.md Ref 101 redesign) -- the
// same visitCount ranking as VenueDetail.top_visitors, at a higher limit.
export const SAMPLE_LOCATION_LEADERBOARD: TopVisitor[] = [
  topVisitor("avap", "Ava P", 17),
  topVisitor("marcust", "Marcus T", 6),
  topVisitor("samk", "Sam K", 3),
  topVisitor("priyan", "Priya N", 2),
  topVisitor("owend", "Owen D", 1),
];

// Sample full POI page (as rendered on /location/[id])
export const SAMPLE_POI_LOCATION: VenueDetail = venueDetail({
  id: "demo-sample-poi",
  name: "Greenwood Water Tower",
  kind: "poi",
  description:
    "A century-old water tower turned neighborhood landmark, with a small viewing plaza and historical plaque at its base.",
  checkin_count: 96,
  favorite_count: 21,
  recent_checkin_mushrooms: [
    recentVisitor("demo-sample-poi-visitor-1", 8),
    recentVisitor("demo-sample-poi-visitor-2", 2),
    recentVisitor("demo-sample-poi-visitor-3", 1),
  ],
  enrichment: {
    venue_id: "demo-sample-poi",
    source: "google",
    rating: 4.4,
    reviews: [
      {
        rating: 5,
        text: "Great little photo spot, especially at sunset.",
        author_name: "Priya N",
        published_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        rating: 4,
        text: "Small but worth the stop if you're in the area.",
        author_name: "Owen D",
        published_at: null,
      },
    ],
    price_tier: null,
    photo_refs: [],
    phone: null,
    website: null,
    hours: null,
    editorial_summary: null,
    atmosphere: null,
    fetched_at: NOW,
  },
});

// Sample full neighborhood page (as rendered on /neighborhoods/[slug])
export const SAMPLE_NEIGHBORHOOD: NeighborhoodProfile = neighborhood({
  id: "demo-sample-neighborhood",
  name: "Greenwood",
  slug: "greenwood-sample",
  description: "A walkable pocket of North Seattle known for antique shops, brewpubs, and a lively weekend market.",
  venue_count: 42,
  poi_count: 11,
  member_count: 318,
  checkin_count: 1204,
  social_links: { instagram: "https://instagram.com/greenwoodseattle", website: "https://greenwoodseattle.example.com" },
  recent_checkin_mushrooms: [
    recentVisitor("demo-sample-visitor-1", 11),
    recentVisitor("demo-sample-visitor-2", 5),
    recentVisitor("demo-sample-visitor-3", 2),
    recentVisitor("demo-sample-visitor-4", 1),
  ],
  top_visitors: [
    topVisitor("morganlee", "Morgan Lee", 11),
    topVisitor("ravik", "Ravi K", 5),
    topVisitor("avap", "Ava P", 2),
  ],
});

export const SAMPLE_NEIGHBORHOOD_EVENTS: Event[] = [
  {
    id: "demo-neighborhood-event-1",
    venue_id: null,
    neighborhood_id: "demo-sample-neighborhood",
    venue_name: null,
    title: "Greenwood Night Market",
    description: "Local vendors, live music, and food trucks along Greenwood Ave.",
    start_time: new Date(Date.now() + 2 * 3600000).toISOString(),
    end_time: new Date(Date.now() + 6 * 3600000).toISOString(),
    created_at: NOW,
    source: "manual",
    location: null,
    status: "active",
  },
];

export const SAMPLE_OPEN_NOW: OpenNowLocation[] = [
  { id: "demo-open-1", name: "Diesel Fuel Coffee", kind: "business", category_name: "Coffee & Tea", closes_at: "6 PM" },
  { id: "demo-open-2", name: "Original Bakery", kind: "business", category_name: "Bakery", closes_at: "5:30 PM" },
  // No closing time -- a 24-hour location (BACKLOG.md Ref 101 redesign).
  { id: "demo-open-3", name: "Greenwood Water Tower", kind: "poi", category_name: null, closes_at: null },
];

// Sample full user profile page (as rendered on /profile/[username])
export const SAMPLE_PROFILE: PublicUserProfile = {
  username: "morganlee",
  display_name: "Morgan Lee",
  avatar_url: null,
  avatar_style: "mushroom",
  mushroom_customization: null,
  joined_at: new Date(Date.now() - 200 * 86400000).toISOString(),
  neighborhoods: [
    { neighborhood_id: "demo-sample-neighborhood", name: "Greenwood", slug: "greenwood-sample", city: "Seattle", state: "WA", is_primary: true },
  ],
  recent_checkins: [
    {
      venue_id: "demo-sample-location",
      name: "Diesel Fuel Coffee",
      address: "5629 University Way NE, Seattle, WA",
      checked_in_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      venue_id: "demo-sample-poi",
      name: "Greenwood Water Tower",
      address: "N 85th St, Seattle, WA",
      checked_in_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    },
  ],
  badges: [{ badge: BADGE_LEVEL_2, awarded_at: new Date(Date.now() - 5 * 86400000).toISOString() }],
  challenges: [
    {
      id: "challenge-coffee-crawl",
      title: "Coffee Crawl",
      description: "Check in to 5 different coffee shops.",
      neighborhood_id: "demo-sample-neighborhood",
      neighborhood_name: "Greenwood",
      points_reward: 50,
      badge: badge({ id: "badge-coffee-crawler-2", code: "coffee_crawler", name: "Coffee Crawler", icon: "coffee" }),
      completed_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
  ],
  checkin_count: 87,
  collection_count: 22,
  points_summary: { points: 940, level: 9, points_into_level: 90, points_to_next_level: 10 },
  neighbor_count: 19,
  neighbor_mushrooms: Array.from({ length: 19 }, (_, i) => neighborMushroom(`demo-profile-neighbor-${i}`)),
};
