import type { MushroomConfig, RecentVisitorMushroom, TopVenue, TopVisitor } from "./mushroom";

export interface HealthCheckResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

// Data layer types (README §1.3). Mirrors the Supabase schema in
// supabase/migrations — keep the two in sync when either changes.

export type NeighborhoodStatus = "onboarding" | "active";

// Instagram links and social media integration (BACKLOG.md Ref 30) -- a
// generic platform->url map rather than one field per platform, so adding a
// new platform is a type change, not a migration. Known keys get typed
// convenience; any other string key is still accepted for forward
// compatibility with platforms not listed here yet.
export type SocialPlatform =
  | "instagram"
  | "twitter"
  | "tiktok"
  | "facebook"
  | "website";
export type SocialLinks = Partial<Record<SocialPlatform, string>>;

// Admin portal boundary drawing (BACKLOG.md Ref 8, project plan §12.6) draws
// and edits this directly rather than any hand-authored coordinates -- a
// single outer ring only, no interior holes (mirrors the same assumption in
// apps/api/src/places/geo.ts's isPointInPolygon).
export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  country: string;
  timezone: string;
  boundary_geojson: GeoJsonPolygon | null;
  center_lat: number;
  center_lng: number;
  status: NeighborhoodStatus;
  created_at: string;
  social_links: SocialLinks;
}

export type CategoryStatus = "active" | "archived";

export interface Category {
  id: string;
  name: string;
  parent_category_id: string | null;
  source_mapping_json: Record<string, unknown>;
  status: CategoryStatus;
}

// A location's kind (BACKLOG.md "POIs and venues managed almost the same")
// -- "business" is the default for anything sync-created from Google Places
// and can be claimed by its owner; "poi" is neighborhood-owned and can never
// be claimed. Designed to admit a third kind later (none planned today)
// without another schema split -- switching kind is a single field update,
// not a move between tables.
export type LocationKind = "business" | "poi";

export interface Venue {
  id: string;
  geoapify_place_id: string | null;
  name: string;
  kind: LocationKind;
  category_id: string | null;
  // POI-only free-text field (BACKLOG.md Ref 6/29) -- null for kind
  // "business", where category_id carries the equivalent classification.
  description: string | null;
  // Nullable only for legacy rows that predate lat/lng (BACKLOG.md Ref 51);
  // address is nullable for the same reason POIs have always allowed it.
  lat: number | null;
  lng: number | null;
  address: string | null;
  neighborhood_id: string;
  // Always false for kind "poi" -- a POI can never be claimed.
  claimed_by_business: boolean;
  status: VenueStatus;
  created_at: string;
  updated_at: string;
}

// Renamed from "google" (Phase 3, docs/geoapify-migration-plan.md) -- the
// underlying data is still fetched from Google's live API until Phase 4
// rewires the actual client, an accepted temporary regression that plan
// calls out explicitly.
export type EnrichmentSource = "geoapify";

export interface VenueEnrichmentCache {
  venue_id: string;
  source: EnrichmentSource;
  phone: string | null;
  website: string | null;
  // Human-readable weekday hours (Google's `regularOpeningHours.weekdayDescriptions`),
  // e.g. ["Monday: 9:00 AM – 5:00 PM", ...] -- avoids parsing raw period data.
  hours: string[] | null;
  editorial_summary: string | null;
  fetched_at: string;
}

// Venue detail page DTOs (BACKLOG "Venue detail pages with enrichment cache").

export interface VenueListItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category_name: string | null;
  // The category's top-level group (README §2's 6 groups, e.g. "Food &
  // Drink") -- distinct from category_name (the specific leaf category, e.g.
  // "Coffee Shop"). Used for map marker color-coding, where 39 leaf colors
  // would be indistinguishable but 6 group colors are.
  category_group: string | null;
}

export interface VenueDetail {
  id: string;
  name: string;
  kind: LocationKind;
  // Null for most manually-created POIs (no Geoapify place behind them) --
  // always populated for kind "business".
  geoapify_place_id: string | null;
  // POI-only field, null for kind "business".
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  category_name: string | null;
  claimed_by_business: boolean;
  enrichment: VenueEnrichmentCache | null;
  // Profile stat (BACKLOG.md Ref 58) -- meaningful for both kinds now that
  // they share one detail page (BACKLOG.md "POIs and venues managed almost
  // the same"), previously POI-only via PoiDetail.
  checkin_count: number;
  // All-time favorite/follow count (BACKLOG.md Ref 30's `favorite` table),
  // shown alongside checkin_count on the summary card for both kinds.
  favorite_count: number;
  // The neighborhood this location belongs to (venues/POIs both browse from
  // the neighborhood page), for the detail page's "back to neighborhood" link.
  neighborhood_slug: string;
  neighborhood_name: string;
  // From the venue's approved business_claim, if any (BACKLOG.md Ref 30) --
  // empty for venues with no approved claim, and always empty for kind "poi"
  // since a POI can never be claimed.
  social_links: SocialLinks;
  // BACKLOG.md Ref 94 "Mushroom size reflects recent check-in activity" --
  // each distinct visitor's *current* live look plus how many times they
  // checked in within the rolling 60-day window, for the "who's foraged
  // here" mosaic (MushroomField's distinctMushrooms mode). Most-visits-first,
  // tie-broken by most recent; excludes visits outside the window.
  recent_checkin_mushrooms: RecentVisitorMushroom[];
  // Up to the top 3 named visitors by visitCount, for the "Top Caps" badge
  // cluster next to the mosaic (BACKLOG.md Ref 101 redesign, mirroring
  // NeighborhoodProfile.top_visitors) -- empty if there are no public, named
  // visitors within the window. The location detail page's Leaderboard tab
  // fetches a separately-limited version of this same ranking via GET
  // /venues/:id/leaderboard, rather than reusing this capped list.
  top_visitors: TopVisitor[];
  // "Open now · until X" pill (BACKLOG.md Ref 101 redesign) -- derived
  // server-side from enrichment.hours (apps/api's resolveOpenStatus) rather
  // than parsed client-side, so it's correct on first paint with no
  // SSR/hydration mismatch risk. Null when there's no cached hours data to
  // determine status from (no enrichment, or today has no parseable line).
  open_status: VenueOpenStatus | null;
}

// Shared by VenueDetail.open_status and OpenNowLocation.closes_at above --
// apps/api's resolveOpenStatus (apps/api/src/locations/hours.ts) is the only
// place this is computed.
export interface VenueOpenStatus {
  open: boolean;
  // Closing time (when open) or next opening time (when closed), formatted
  // for display ("6 PM", "9:30 AM") -- null for a 24-hour location (open,
  // nothing to show) or when hours don't specify a boundary for the closed
  // case.
  time: string | null;
}

// Business claiming + GPS check-in (BACKLOG.md, README §4/§5).

export interface Checkin {
  id: string;
  user_id: string;
  // Targets either a business or a POI (BACKLOG.md Ref 6) -- both are rows
  // in the same table since the venue/poi merge, so one id column covers
  // both kinds.
  venue_id: string;
  device_lat: number;
  device_lng: number;
  checked_in_at: string;
}

export interface CreateCheckinRequest {
  lat: number;
  lng: number;
}

// POST /locations/:id/checkins response addition -- badges/challenges this
// specific check-in newly unlocked, for the check-in UI's result card.
// Distinct from Badge/Challenge's own catalog shapes since this is scoped to
// "what happened just now" rather than "what exists."
export interface CompletedChallengeSummary {
  id: string;
  title: string;
  points_reward: number;
  badge: Badge | null;
}

export interface CheckinRewardsSummary {
  points_earned: number;
  challenges_completed: CompletedChallengeSummary[];
  badges_earned: Badge[];
}

export interface CheckinResult extends Checkin {
  rewards: CheckinRewardsSummary;
}

export interface Favorite {
  id: string;
  user_id: string;
  venue_id: string;
  created_at: string;
}

export interface FavoriteStatusResponse {
  favorited: boolean;
}

// GET /me/favorites -- venue-joined listing for the "My account" page
// (BACKLOG.md), since the raw Favorite row above has no venue name/address.
export interface FavoriteVenueSummary {
  venue_id: string;
  name: string;
  address: string;
  created_at: string;
}

// GET /me/collection (BACKLOG.md Ref 98/101) -- a collected mushroom
// "species", one per venue checked into, neighbor connected with, or
// neighborhood joined. mushroom/species_name are derived
// (mushroomConfigForSpecies/mushroomSpeciesName in ./mushroom), not stored --
// source_name is the only piece that needs a join (venue.name, the other
// user's display name, or neighborhood.name). The API always sends the full
// look/name even when `revealed` is false -- "reveal" is a client-side
// flip-card delight moment (POST /me/collection/:id/reveal just persists
// that it happened), not a server-side spoiler gate.
export interface MushroomCollectionEntry {
  id: string;
  source_type: "checkin" | "connection" | "neighborhood";
  source_id: string;
  source_name: string;
  // The route param for source_type "connection" (a username, for
  // /profile/[username]) or "neighborhood" (a slug, for
  // /neighborhoods/[slug]) -- null for "checkin", which links via source_id
  // itself (/location/[source_id]) and needs no separate field.
  source_slug: string | null;
  // Business vs. POI, for a "checkin" source only -- null for "connection"/
  // "neighborhood" (neither has a LocationKind) and for a "checkin" whose
  // venue kind couldn't be resolved. Lets the collection UI mark a card's
  // type the same way EntityTile does on a venue/neighborhood's own page.
  location_kind: LocationKind | null;
  species_name: string;
  mushroom: MushroomConfig;
  quantity: number;
  first_collected_at: string;
  revealed: boolean;
}

// GET /me/checkins -- venue-joined check-in history for the "My account"
// page, mirroring FavoriteVenueSummary above.
export interface CheckinHistoryItem {
  venue_id: string;
  name: string;
  address: string;
  checked_in_at: string;
}

export type BusinessClaimContactMethod = "phone" | "email";
export type BusinessClaimStatus = "pending" | "approved" | "rejected";

export interface BusinessClaim {
  id: string;
  venue_id: string;
  contact_name: string;
  contact_method: BusinessClaimContactMethod;
  contact_value: string;
  note: string | null;
  status: BusinessClaimStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_note: string | null;
  // The signed-in account that submitted the claim -- claiming requires an
  // account (BACKLOG.md Ref 32), so this is always populated.
  claimed_by_user_id: string;
  social_links: SocialLinks;
}

// Neighborhood-admin claims tab (docs/url-map.md refactor) needs the venue's
// name/address alongside the claim -- the global admin/claims page never
// joined through to venue, since it only showed the raw venue_id.
export interface BusinessClaimWithVenue extends BusinessClaim {
  venue_name: string;
  venue_address: string;
  // The linked account's own profile info, joined from claimed_by_user_id --
  // lets an admin cross-check the submitted contact info against the actual
  // signed-in account behind the claim (BACKLOG.md Ref 32). Not masked by
  // the account's profile visibility setting; claim review is an
  // administrative function, not a public-facing one.
  claimant_display_name: string | null;
  claimant_username: string | null;
  claimant_email: string | null;
}

export interface CreateBusinessClaimRequest {
  contact_name: string;
  contact_method: BusinessClaimContactMethod;
  contact_value: string;
  note?: string;
}

// Revoke an already-approved claim (BACKLOG.md "POIs and venues managed
// almost the same") -- reviewClaim only handles pending claims, so this is
// the only way to flip claimed_by_business back to false, e.g. to unblock
// switching a claimed business to POI kind (which is never allowed while
// claimed).
export interface RevokeClaimRequest {
  reason?: string;
}

export interface UpdateSocialLinksRequest {
  social_links: SocialLinks;
}

// Real user authentication (BACKLOG.md, project-plan.md §14).

export type AccountType = "consumer" | "business";

// BACKLOG.md "User profiles with public or private visibility" -- private by
// default, since a signed-in identity doesn't by itself imply the user wants
// their presence (activity, connections) visible to anyone else.
export type ProfileVisibility = "public" | "private";

// BACKLOG.md "Mushroom avatars" -- avatar_url is seeded once from the OAuth
// provider's photo at signup and is otherwise read-only (never client-
// settable via PATCH /me/profile, to close off arbitrary/explicit-content
// URLs); avatar_style is the only user-editable choice, picking between that
// social photo and the account's randomly-assigned mushroom (packages/ui's
// mushroomConfigForUser, deterministic from `id` -- no image upload/URL
// involved either way).
export type AvatarStyle = "social" | "mushroom";

// BACKLOG.md Ref 75 "Mushroom avatar customizer" -- a deliberate override of
// the hash-derived look mushroomConfigForUser (./mushroom.ts) would otherwise
// pick. Approved cap/stalk/spots/bg/spotCount/spotShape values are enforced
// server-side (PATCH /me/profile), not by this type, so a stored value is
// always renderable. stalk, spots, and bg are independent choices (not one
// mirroring another), as are spotCount and spotShape (any count 0-6 pairs
// with any shape) rather than a fused named pattern. bg only affects Avatar
// rendering's backdrop circle, not MushroomField's decorative growing-field
// icons (which never render a background at all).
export interface MushroomCustomization {
  // Plain string (not MushroomShape) for the same reason spotShape is a
  // plain string here -- packages/types has no dependency on the shape enum
  // it validates against server-side (isValidMushroomCustomization).
  shape: string;
  cap: string;
  stalk: string;
  spots: string;
  bg: string;
  spotCount: number;
  spotShape: string;
}

// BACKLOG.md Ref 102 follow-up: per-category push opt-outs, surfaced as
// individual toggles on the Notifications section of /account/settings
// (NotificationToggle is the master browser-permission switch; these gate
// which categories still send once that switch is on). Every category
// defaults true so an existing account's behavior doesn't change until they
// explicitly opt out of something. Deliberately excludes the admin-only
// pushes (new signup, feedback, missing-venue reports) -- those are
// operational alerts tied to a role, not a personal preference.
export interface NotificationPreferences {
  checkins: boolean;
  connection_requests: boolean;
  connection_accepted: boolean;
  event_reminders: boolean;
  // A followed (favorited) venue launches a new coupon.
  new_coupons: boolean;
}

export interface AppUser {
  id: string;
  account_type: AccountType;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_style: AvatarStyle;
  // Null until the user saves a customizer choice -- rendering falls back
  // to mushroomConfigForUser(id) until then.
  mushroom_customization: MushroomCustomization | null;
  // BACKLOG.md "Public user profiles" -- the handle a public profile is
  // addressed by (/profile/:username), distinct from the internal id.
  // Unset (null) until the user chooses one; unique when set.
  username: string | null;
  visibility: ProfileVisibility;
  created_at: string;
  // Additive to account_type -- an account can be a consumer, a claimed
  // business owner, and a neighborhood admin all at once (BACKLOG.md
  // "Neighborhood admin invites").
  is_neighborhood_admin: boolean;
  // A rung above is_neighborhood_admin (BACKLOG.md) -- bypasses the 24h
  // "Reimport Locations" cooldown and, for now, is the only role that can
  // create a brand-new neighborhood at all.
  is_super_admin: boolean;
  notification_preferences: NotificationPreferences;
}

export interface UpdateProfileRequest {
  display_name?: string | null;
  avatar_style?: AvatarStyle;
  mushroom_customization?: MushroomCustomization | null;
  username?: string | null;
  visibility?: ProfileVisibility;
  // Partial -- only the categories present are changed, mirroring the rest
  // of this request shape's "omitted means unchanged" semantics.
  notification_preferences?: Partial<NotificationPreferences>;
}

export interface CompleteSignupRequest {
  account_type?: AccountType;
}

// GET /admin/users (superAdminGate) -- every account on the platform, for
// the super admin UI's user list (BACKLOG.md). Deliberately not the same
// shape as AppUser except for mushroom_customization (needed so the list's
// mushroom column shows each account's real current look -- a saved
// customizer choice, when present -- rather than only its hash-derived
// default): no avatar_url, and role flags and has_push_enabled are what a
// super admin actually cares about when scanning accounts, not the full
// self-view.
export interface AppUserAdminView {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  account_type: AccountType;
  visibility: ProfileVisibility;
  created_at: string;
  is_neighborhood_admin: boolean;
  is_super_admin: boolean;
  mushroom_customization: MushroomCustomization | null;
  // Whether this account has at least one active push_subscription row
  // (BACKLOG.md Ref 89) -- there's no per-endpoint "enabled" flag, just
  // presence/absence of subscribed devices, same signal "Send test push"
  // already acts on.
  has_push_enabled: boolean;
  // How the account signed up ("google", "email", ...) -- Supabase's
  // app_metadata.provider at token verification time, null only for rows
  // old enough to predate the auth_provider column.
  auth_provider: string | null;
  // Stamped on every real POST /auth/complete-login (not on every /auth/me
  // poll) -- defaults to the signup timestamp until a second visit.
  last_login_at: string;
}

export interface ClaimedVenueSummary {
  venue_id: string;
  name: string;
  address: string;
}

// Business owner venue dashboard (BACKLOG.md) -- Coupon/Event content types
// an approved claimed-business owner can author for their venue, plus the
// read-only stats the dashboard shows alongside them (README §1.8/§5).

// Venue coupons (BACKLOG.md Ref 83, replacing the old Announcement content
// type outright -- neighborhoods keep their own separate announcements
// concept, Ref 9, not yet built). quantity_remaining is decremented at claim
// time (one of N copies reserved), not at redemption.
export interface Coupon {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  terms: string | null;
  quantity: number;
  quantity_remaining: number;
  start_at: string;
  end_at: string;
  created_at: string;
}

export interface CreateCouponRequest {
  title: string;
  description: string;
  terms?: string;
  quantity: number;
  start_at: string;
  end_at: string;
}

export type CouponStatus = "upcoming" | "active" | "ended";

// A user's reservation of one of a coupon's N copies -- unlocked by a
// checkin at the venue (or an existing checkin within the checkin cooldown
// window), then redeemed in person via slide-to-redeem. redeemed_at is
// permanent once set: reopening a redeemed coupon shows this timestamp
// instead of the slide control.
export interface CouponClaim {
  id: string;
  coupon_id: string;
  user_id: string;
  claimed_at: string;
  redeemed_at: string | null;
}

// GET /venues/:id/coupons and GET /me/coupons -- a coupon plus the viewer's
// own claim state against it. claim is null when signed out or not yet
// claimed. eligible_to_claim is true only when signed in, unclaimed, active,
// and the viewer has a checkin at this venue within the cooldown window --
// the "already at the venue" auto-grant case from BACKLOG.md Ref 83.
export interface CouponWithClaim extends Coupon {
  status: CouponStatus;
  claim: CouponClaim | null;
  eligible_to_claim: boolean;
}

// "manual" is the existing EventForm authoring path; "ical" is a row
// upserted by an iCal/webcal feed sync (BACKLOG.md Ref 30).
export type EventSource = "manual" | "ical";

// "hidden" survives an iCal re-sync (upsertImportedEvents never overwrites
// status), unlike a hard delete which a re-sync would just undo -- the way
// to suppress one specific imported event without excluding it from future
// syncs.
export type EventStatus = "active" | "hidden";

export interface Event {
  id: string;
  // Exactly one of venue_id/neighborhood_id is set.
  venue_id: string | null;
  neighborhood_id: string | null;
  // The hosting business's name, only populated for venue-scoped events
  // returned by GET /neighborhoods/:id/events (BACKLOG.md Ref 27's merged
  // neighborhood+business Upcoming events tab) -- null everywhere else.
  venue_name: string | null;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  created_at: string;
  source: EventSource;
  // Free-text location (BACKLOG.md Ref 30) -- always null for manually
  // created events. For imported events, it's the feed's own per-event
  // LOCATION for a neighborhood-owned import, or the venue's own address
  // (auto-filled, not read from the feed) for a venue-owned import.
  location: string | null;
  status: EventStatus;
}

export interface UpdateEventStatusRequest {
  status: EventStatus;
}

// Follow events (BACKLOG.md Ref 81) -- signed-in-only bookmark on an event,
// mirroring Favorite's shape.
export interface EventFollow {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
}

export interface EventFollowStatusResponse {
  following: boolean;
}

// GET /me/events -- event-joined listing for the "My account" page's Events
// tab, mirroring FavoriteVenueSummary. Reuses the Event shape (rather than a
// narrower summary type) since EventListItem already renders an Event
// directly; followed_at is the only addition on top of a plain Event.
export interface FollowedEventSummary extends Event {
  followed_at: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
}

// User-submitted bug reports/feature requests (BETA-prep): a signed-in-only
// freeform comment tied to the account, POST /me/feedback. Triaged through
// `state` in the super admin shell's Feedback tab -- awards the "Feedback
// Giver" badge on first submission and the "Contributor" badge when a
// submission is later marked "done" via PATCH /admin/feedback/:id.
//
// "missing_venue" (BACKLOG.md Ref 80/96) is a third type sharing the same
// table/state machine, but routed to the *reported neighborhood's own*
// admins instead of super admins (GET/PATCH
// /neighborhood-admin/neighborhoods/:id/feedback, not /admin/feedback) --
// it's the only type that populates neighborhood_id/venue_name below.
export type FeedbackType = "bug" | "feature" | "missing_venue";
export type FeedbackState = "new" | "in_progress" | "done" | "removed";

export interface FeedbackSubmission {
  id: string;
  user_id: string;
  type: FeedbackType;
  comment: string;
  state: FeedbackState;
  created_at: string;
  // "missing_venue" only -- null for bug/feature.
  neighborhood_id: string | null;
  venue_name: string | null;
}

export interface CreateFeedbackRequest {
  type: FeedbackType;
  // Required for bug/feature; optional extra notes for missing_venue.
  comment: string;
  // Required when type is "missing_venue", omitted otherwise.
  neighborhood_id?: string;
  venue_name?: string;
}

// GET /admin/feedback (bug/feature, super admin) and GET
// /neighborhood-admin/neighborhoods/:id/feedback (missing_venue, scoped to
// that neighborhood's own admins) both return this same joined shape --
// basic submitter identity, since a bare user_id isn't useful in either
// triage UI without it.
export interface FeedbackSubmissionAdminView extends FeedbackSubmission {
  user_display_name: string | null;
  user_email: string | null;
}

export interface UpdateFeedbackStateRequest {
  state: FeedbackState;
}

// Web push subscriptions (BACKLOG.md Ref 89) -- one row per browser/device,
// POST /me/push-subscriptions to register, DELETE /me/push-subscriptions/:id
// to unregister. `keys` mirrors the PushSubscriptionJSON shape the browser's
// pushManager.subscribe() returns.
export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  created_at: string;
}

export interface CreatePushSubscriptionRequest {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

// PATCH .../ical-feed request/response (BACKLOG.md Ref 30) -- shared shape
// for both the neighborhood-admin and business-owner feed URL settings form.
export interface UpdateIcalFeedUrlRequest {
  ical_feed_url: string;
}

export interface IcalFeedSettings {
  ical_feed_url: string | null;
  ical_synced_at: string | null;
}

// POST .../ical-feed/sync response.
export interface IcalSyncResponse {
  imported: number;
  updated: number;
  synced_at: string;
}

// Neighborhood profile pages (BACKLOG.md) -- public profile mirroring the
// venue/business profile shape but scoped to Neighborhood: a description,
// neighborhood-owned POIs, and neighborhood-wide events. Authored by that
// neighborhood's own admins (requireNeighborhoodAdmin), mirroring the
// business owner venue dashboard's shape.

export interface NeighborhoodProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  pois: Venue[];
  social_links: SocialLinks;
  // Profile stats (BACKLOG.md Ref 58) -- venue_count/poi_count are
  // active-only, mirroring the public venue/POI list filters; checkin_count
  // sums check-ins against both this neighborhood's venues and POIs.
  venue_count: number;
  poi_count: number;
  member_count: number;
  checkin_count: number;
  // BACKLOG.md Ref 94 "Mushroom size reflects recent check-in activity" --
  // each distinct visitor's *current* live look plus how many times they
  // checked in across the neighborhood within the rolling 60-day window, for
  // the mosaic (MushroomField's distinctMushrooms mode). Most-visits-first,
  // tie-broken by most recent; excludes visits outside the window.
  recent_checkin_mushrooms: RecentVisitorMushroom[];
  // Up to the top 3 named visitors by visitCount, for the "Top Caps" badge
  // cluster next to the mosaic -- empty if there are no public, named
  // visitors within the window.
  top_visitors: TopVisitor[];
  // Location leaderboard counterpart to top_visitors -- same rolling 60-day
  // window and same rankRecentVisitors ranking, just grouped by venue_id
  // instead of user_id, for the neighborhood Leaderboard tab's "which places
  // are busiest" section. Unlike top_visitors, never filtered for privacy
  // (venues have no visibility setting), so this is always the true top 3 by
  // visit count.
  top_venues: TopVenue[];
}

// Neighborhood membership (BACKLOG.md "Neighborhoods on landing page and user
// profile") -- a signed-in user joining a neighborhood, with at most one
// marked as their "home" neighborhood (is_primary).

export interface NeighborhoodMembership {
  neighborhood_id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  is_primary: boolean;
}

// GET /users/:username (BACKLOG.md "Public user profiles") -- only ever
// returned for a public-visibility profile with a username set; recent
// check-ins are gated by that same profile-level visibility, since checkin
// has no per-row privacy field of its own.
export interface PublicUserProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_style: AvatarStyle;
  mushroom_customization: MushroomCustomization | null;
  joined_at: string;
  neighborhoods: NeighborhoodMembership[];
  recent_checkins: CheckinHistoryItem[];
  badges: UserBadge[];
  // Every challenge this user has completed, across every neighborhood --
  // mirrors `badges` above (the profile page shows only the latest of each,
  // client-side, same as /account's tabs).
  challenges: UserChallenge[];
  // Added alongside ProfileSummaryCard reuse on the public profile page --
  // checkin_count/collection_count are all-time totals (unlike recent_checkins,
  // capped to PUBLIC_PROFILE_CHECKIN_LIMIT), mirroring /me/points'
  // account-page equivalent. collection_count is the forager collection's
  // total species count (BACKLOG.md Ref 98) -- the collected species
  // themselves stay private, only /me/collection lists them.
  checkin_count: number;
  collection_count: number;
  points_summary: UserPointsSummary;
  // BACKLOG.md Ref 14/33 "Connect with other users" -- accepted-connection
  // count only; the neighbors themselves (usernames, avatars) are a
  // separate, request-gated listing (GET /me/connections), not exposed on
  // someone else's profile.
  neighbor_count: number;
  // BACKLOG.md Ref 97 "Profile card: live, one-to-one neighbor mushrooms" --
  // each accepted neighbor's *current* live look (resolved server-side, not
  // a frozen accept-time snapshot), one per neighbor. Carries no
  // username/id linkage, so -- like the venue/neighborhood mosaics -- it's
  // safe to expose alongside the bare count rather than gated behind the
  // request-based neighbor check ProfileDetails.tsx applies to
  // badges/neighborhoods/check-ins.
  neighbor_mushrooms: MushroomConfig[];
  // Reverse "Top Caps" lookup (BACKLOG.md Ref 94/101's rank-1/2/3 badge
  // cluster, normally shown *on* a venue/neighborhood card) -- every venue
  // this user has visited within the rolling 60-day window, or neighborhood
  // they belong to, where they currently rank in that place's own top 3 by
  // visit count. `id` is the venue_id or neighborhood_id; `slug` is set only
  // for a neighborhood entry (venues link via `/location/:id`, neighborhoods
  // via `/neighborhoods/:slug`). Sorted best-rank-first.
  top_caps: ProfileTopCap[];
}

export interface ProfileTopCap {
  kind: "venue" | "neighborhood";
  id: string;
  slug?: string;
  name: string;
  rank: number;
  visit_count: number;
}

// GET /me/connections/mutual/:username -- how many of the caller's own
// accepted neighbors are *also* an accepted neighbor of the target user, a
// trust signal shown before the caller has connected with them (BACKLOG.md
// "Connect with other users" follow-up). Deliberately just a count, not the
// overlapping identities themselves, even though the caller could see who
// those mutual neighbors are on their own /account/neighbors -- keeps this
// endpoint from doubling as a way to enumerate a stranger's connections.
export interface MutualNeighborsSummary {
  count: number;
}

// BACKLOG.md Ref 14/33 "Connect with other users" / "Friends/neighbors on
// profile": a mutual, request-based relationship between two accounts,
// called a "neighbor" in UI copy rather than "friend". Declining a pending
// request, cancelling one, or removing an accepted connection are all a
// hard delete server-side -- there's no "declined" status to represent.
export type ConnectionStatus = "pending" | "accepted";

export interface UserConnection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  created_at: string;
  responded_at: string | null;
}

// GET /me/connections -- user-joined listing for the "My account" page's
// Neighbors section, mirroring FavoriteVenueSummary's venue-joined shape.
// direction tells the UI whether a pending row is incoming (show
// accept/decline) or outgoing (show cancel).
export interface ConnectionSummary {
  id: string;
  status: ConnectionStatus;
  direction: "incoming" | "outgoing";
  created_at: string;
  user: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    avatar_style: AvatarStyle;
    mushroom_customization: MushroomCustomization | null;
  };
}

export interface CreateConnectionRequest {
  username: string;
}

export interface NeighborhoodSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  // Populated only when the request is authenticated -- null for anonymous
  // visitors browsing the landing page's full neighborhood list.
  joined: boolean;
  business_count: number;
  member_count: number;
}

export interface NeighborhoodAdminSummary {
  neighborhood_id: string;
  name: string;
  slug: string;
}

export interface NeighborhoodDashboardSummary {
  neighborhood_id: string;
  name: string;
  slug: string;
  description: string | null;
  pois: Venue[];
  events: Event[];
  social_links: SocialLinks;
  ical_feed_url: string | null;
  ical_synced_at: string | null;
  status: NeighborhoodStatus;
}

// Neighborhood-admin Analytics tab: check-ins over time, activity-by-type
// breakdown, locations-by-category-group, and a top-venues leaderboard --
// one combined shape since get_neighborhood_analytics returns all four
// together in a single RPC call.
export interface NeighborhoodAnalyticsDailyCheckins {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

export interface NeighborhoodAnalyticsActivityByType {
  event_type: "checkin" | "favorite" | "challenge_completion";
  count: number;
}

export interface NeighborhoodAnalyticsLocationsByCategoryGroup {
  category_group: string;
  kind: "business" | "poi";
  count: number;
}

export interface NeighborhoodAnalyticsTopVenue {
  venue_id: string;
  name: string;
  checkin_count: number;
}

export interface NeighborhoodAnalytics {
  neighborhood_id: string;
  days: number;
  checkins_over_time: NeighborhoodAnalyticsDailyCheckins[];
  activity_by_type: NeighborhoodAnalyticsActivityByType[];
  locations_by_category_group: NeighborhoodAnalyticsLocationsByCategoryGroup[];
  top_venues: NeighborhoodAnalyticsTopVenue[];
}

// Business-admin Analytics tab (mirrors NeighborhoodAnalytics above): one
// combined shape since get_venue_analytics returns all four together in a
// single RPC call. locations_by_category_group/top_venues don't have a
// venue-scoped equivalent, so checkins_by_day_of_week and
// coupon_claims_over_time take their place instead.
export interface VenueAnalyticsDailyCheckins {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

export interface VenueAnalyticsActivityByType {
  event_type: "checkin" | "favorite" | "challenge_completion";
  count: number;
}

export interface VenueAnalyticsDayOfWeekCheckins {
  day_of_week: number; // 0 (Sunday) - 6 (Saturday), matching Postgres extract(dow)
  count: number;
}

export interface VenueAnalyticsCouponClaims {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

export interface VenueAnalyticsEventFollows {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

export interface VenueAnalyticsTopFollowedEvent {
  event_id: string;
  title: string;
  // Disambiguates same-titled events (e.g. a recurring "Retro Game Night").
  start_time: string;
  follow_count: number;
}

export interface VenueAnalytics {
  venue_id: string;
  days: number;
  checkins_over_time: VenueAnalyticsDailyCheckins[];
  activity_by_type: VenueAnalyticsActivityByType[];
  checkins_by_day_of_week: VenueAnalyticsDayOfWeekCheckins[];
  coupon_claims_over_time: VenueAnalyticsCouponClaims[];
  event_follows_over_time: VenueAnalyticsEventFollows[];
  top_followed_events: VenueAnalyticsTopFollowedEvent[];
}

// Admin portal boundary drawing (BACKLOG.md Ref 8, project plan §12.6).

export interface NeighborhoodBoundary {
  boundary_geojson: GeoJsonPolygon | null;
  center_lat: number;
  center_lng: number;
}

export interface UpdateNeighborhoodBoundaryRequest {
  boundary_geojson: GeoJsonPolygon;
}

export interface CreateNeighborhoodRequest {
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  boundary_geojson: GeoJsonPolygon;
}

export interface CreateNeighborhoodResponse {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  status: NeighborhoodStatus;
  boundary_geojson: GeoJsonPolygon;
  center_lat: number;
  center_lng: number;
}

// Dry-run Google Places query preview (project plan §12.6) -- plotted as
// markers on the same map before the admin commits the drawn boundary.
export interface BoundaryPreviewCandidate {
  name: string;
  lat: number;
  lng: number;
  address: string;
  category_name: string | null;
}

export interface BoundaryPreviewReport {
  tiles_queried: number;
  api_calls_made: number;
  calls_at_result_cap: number;
  candidates: BoundaryPreviewCandidate[];
}

export interface UpdateNeighborhoodDescriptionRequest {
  description: string;
}

// Manual location creation (BACKLOG.md "POIs and venues managed almost the
// same") -- today only wired up for kind "poi" (the "+ Add point of
// interest" admin flow); kind "business" is accepted for forward
// compatibility but has no manual-create UI yet, since businesses are
// otherwise always sync-created from Google Places.
export interface CreateLocationRequest {
  kind: LocationKind;
  name: string;
  description?: string;
  category_id?: string;
  // Required so the location can be a GPS-verified check-in target
  // (BACKLOG.md Ref 6), matching the venue check-in geofence approach.
  lat: number;
  lng: number;
  address?: string;
  geoapify_place_id?: string;
}

// Location edit (BACKLOG.md Ref 29, generalized from POI-only), all optional
// since an edit may only touch one field at a time.
export interface UpdateLocationRequest {
  name?: string;
  description?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

// Location hide/restore (BACKLOG.md Ref 29), applies uniformly to either kind.
export interface SetLocationStatusRequest {
  status: VenueStatus;
}

// Switch an existing location between business and poi kind in place
// (BACKLOG.md "POIs and venues managed almost the same") -- replaces the old
// hide-then-recreate-as-a-new-row "Convert to POI" flow.
export interface SetLocationKindRequest {
  kind: LocationKind;
  // Optional even when switching to "business" -- matches today's nullable
  // venue.category_id ("Unmapped" is a valid state, reassignable later via
  // the existing category dropdown).
  category_id?: string;
}

// GET /business/venues/:id/dashboard -- follower count is a count of
// `favorite` rows (there's no separate "follow" table; favoriting a venue is
// the follow relationship, per the backlog item's own notes), check-in count
// is a count of `checkin` rows.
export interface VenueDashboardSummary {
  venue_id: string;
  name: string;
  address: string;
  follower_count: number;
  checkin_count: number;
  coupons: Coupon[];
  events: Event[];
  social_links: SocialLinks;
  ical_feed_url: string | null;
  ical_synced_at: string | null;
}

// Category mapping admin tool (BACKLOG.md) -- manual override for venues the
// sync's category-normalization step (README §1.4 step 3) mapped incorrectly.

// "removed" (BACKLOG.md "Reimport Locations") is distinct from "hidden": set
// only when a location review's boundary-removal is approved (it's no
// longer geographically part of the neighborhood at all), and -- unlike
// "hidden" -- never surfaced in the admin Locations tab even with "Show
// hidden" toggled on.
export type VenueStatus = "active" | "hidden" | "removed";

// Locations admin tab (BACKLOG.md Ref 29) -- a single merged view over every
// location in a neighborhood regardless of kind, so an admin doesn't have to
// cross-reference two separate lists to see everything geographically in the
// neighborhood. Read-only composition: each row's own kind-specific fields
// (category reassignment, POI type/description) are still edited through the
// existing location endpoints, not through this shape.
export interface LocationListItem {
  id: string;
  kind: LocationKind;
  name: string;
  address: string | null;
  // Business: the assigned category name. POI: the static string "Point of
  // interest" (POIs carry no classification of their own). Never both,
  // since a row is exactly one kind.
  category_or_type: string;
  // Business only -- backs the category-reassign dropdown's selected value;
  // null for POI rows (and for a business with no category mapped yet).
  category_id: string | null;
  status: VenueStatus;
  claimed_by_business: boolean;
  // Null only for legacy POI rows that predate lat/lng (BACKLOG.md Ref 51) --
  // always populated for businesses.
  lat: number | null;
  lng: number | null;
  geoapify_place_id: string | null;
}

// Bulk Places review (BACKLOG.md Ref 29) -- a Google Places entity inside the
// neighborhood's boundary that isn't yet a venue or POI. Admin-triggered
// (costs a real Places API query each run), not surfaced automatically.
export interface LocationReviewCandidate {
  geoapify_place_id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  // The sync pipeline's own category match, shown as a suggested default --
  // still overridable by the admin when classifying as a business.
  suggested_category_id: string | null;
  suggested_category_name: string | null;
}

// Boundary reconciliation (BACKLOG.md Ref 54): an *active* venue or POI
// still on record whose location no longer falls inside the neighborhood's
// current (saved) boundary -- e.g. after a redraw. Surfaced for explicit
// admin approval rather than silently staying attached or silently hidden.
export interface LocationRemovalCandidate {
  id: string;
  name: string;
  address: string | null;
}

export interface LocationReviewReport {
  tiles_queried: number;
  api_calls_made: number;
  calls_at_result_cap: number;
  new_candidates: LocationReviewCandidate[];
  proposed_removals: LocationRemovalCandidate[];
  last_reviewed_at: string;
  next_allowed_at: string;
}

// "Reimport Locations" cooldown (BACKLOG.md) -- once every 24h per
// neighborhood, enforced server-side. Read on both the Locations tab (to
// show/disable the reimport button before the admin even navigates to the
// review page) and the review page itself (so "Run review" reflects the
// same cooldown rather than only failing after the fact with a 429).
export interface LocationsReviewCooldownStatus {
  last_reviewed_at: string | null;
  next_allowed_at: string | null;
  can_run: boolean;
}

export type LocationClassification = "business" | "poi" | "omit";

export interface LocationReviewClassificationInput {
  geoapify_place_id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  classification: LocationClassification;
  // Required when classification is "business".
  category_id?: string;
}

export interface LocationRemovalApproval {
  id: string;
}

export interface CommitLocationReviewRequest {
  classifications: LocationReviewClassificationInput[];
  removals: LocationRemovalApproval[];
}

export interface CommitLocationReviewResult {
  created_businesses: string[];
  created_pois: string[];
  // Persisted as a hidden POI, not just skipped -- see BACKLOG.md "Reimport
  // Locations": an omitted candidate is still recorded (matched by
  // geoapify_place_id on future reviews) so it never resurfaces asking for a
  // decision again, it just doesn't show up as an active location.
  omitted: string[];
  // Set to "removed" (not "hidden") -- fully detached from the
  // neighborhood, never shown in the admin Locations tab even with "Show
  // hidden" on.
  removed: string[];
  failed: { name: string; error: string }[];
}

// Missing-location investigation (BACKLOG.md Ref 96) -- a single admin
// Geoapify Geocoding lookup for one reported-missing venue, distinct from
// LocationReviewCandidate (a full-boundary Places search sweep): a
// free-text query has no category restriction, so it can surface a place
// the boundary-wide review/sync flow never would, along with why it looks
// missing. No businessStatus equivalent exists in OSM data (unlike Google),
// so there's no "closed" signal to surface here.
export interface PlacesInvestigationCandidate {
  geoapify_place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  categories: string[];
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  // Name of the existing venue/POI already keyed to this exact Geoapify
  // place, if any -- means it isn't actually missing, just not found under
  // this name.
  already_known_as: string | null;
  // Null when the neighborhood has no saved boundary to test against.
  inside_boundary: boolean | null;
}

export interface PlacesInvestigationReport {
  query: string;
  candidates: PlacesInvestigationCandidate[];
}

export interface AddInvestigatedLocationRequest {
  geoapify_place_id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  category_id: string;
}

export interface AddInvestigatedLocationResult {
  created_businesses: string[];
}

// A Geoapify search/reverse-geocode candidate for the "Reassign place ID"
// admin action (BACKLOG.md Ref 114) -- distance_meters is always a real
// number (from the location being reassigned, or the neighborhood centroid
// as a coarser fallback), never null, since a distance-blind attach is
// exactly how a wrong place got attached to a real venue 2,500+ miles away
// before this guardrail existed.
export interface GeoapifyPlaceCandidate {
  geoapify_place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance_meters: number;
}

// Empty candidates means Geoapify has no named POI at the location's exact
// coordinates today (a bare "building" result, filtered out server-side),
// not a failure.
export interface GeoapifyReverseGeocodeResult {
  candidates: GeoapifyPlaceCandidate[];
}

// Only leaf categories (see supabase/migrations/.../category_taxonomy.sql)
// are valid assignment targets -- the 6 top-level group rows are
// organizational only, so this list excludes them.
export interface CategoryOption {
  id: string;
  name: string;
  group_name: string | null;
}

export interface ReassignVenueCategoryRequest {
  category_id: string;
}

// Category taxonomy management (BACKLOG.md Ref 4) -- create/rename/archive
// actions on the category table itself (both top-level groups and leaves),
// distinct from CategoryOption/ReassignVenueCategoryRequest above which only
// reassign a venue's existing category.

export interface CategoryAdminItem {
  id: string;
  name: string;
  parent_category_id: string | null;
  status: CategoryStatus;
  // The Geoapify/OSM category tags that normalize into this leaf category
  // (docs/geoapify-migration-plan.md Phase 2) -- empty for top-level group
  // rows.
  geoapify_categories: string[];
}

export interface CreateCategoryRequest {
  name: string;
  // null creates a new top-level group; a string must reference an existing
  // top-level group (2-level taxonomy only, no nesting under a leaf).
  parent_category_id: string | null;
  geoapify_categories?: string[];
}

export interface RenameCategoryRequest {
  name: string;
}

// Challenges + badges/points (BACKLOG.md Ref 6) -- core gamification loop.
// Points: check-in = 10, first-time favorite/follow a venue = 5. Challenges
// are template-driven (a data row, not code) and reward bonus points plus an
// optional badge on completion.

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  // null = app-wide (the vast majority); set = this badge belongs to one
  // neighborhood specifically (BACKLOG.md Ref 108 follow-up). Resolve the
  // name client-side against GET /neighborhoods rather than a denormalized
  // neighborhood_name field here, since every consumer of this type already
  // has (or can cheaply fetch) that full list.
  neighborhood_id: string | null;
}

// A badge a user has earned (BACKLOG.md Ref 55), across every neighborhood
// and however it was awarded -- challenge completion or a direct award like
// the founder badge -- shown on the public profile and account pages.
export interface UserBadge {
  badge: Badge;
  awarded_at: string;
}

// "rule" = a global badge_rule row (BACKLOG.md Ref 108's badge_rule engine,
// already app-wide by construction); "challenge" = awarded via a challenge's
// badge_id; "manual" = a one-off award with neither (e.g. the founder
// badge). A badge can be earned more than one way at once, hence an array.
export type BadgeEarnMethod = "rule" | "challenge" | "manual";

// One challenge that awards this badge on completion.
export interface BadgeAdminChallengeRef {
  id: string;
  title: string;
  // Both null when the awarding challenge is itself app-wide.
  neighborhood_id: string | null;
  neighborhood_name: string | null;
}

// Super admin's Badges view (BACKLOG.md Ref 108): every badge, classified by
// how it's earned. neighborhood_id/neighborhood_name reflect the badge's own
// direct scope (e.g. a category_milestone "Explorer" badge re-homed to one
// neighborhood -- both null for an app-wide badge). scope is
// "neighborhood_specific" either when neighborhood_id is set directly, or
// (for a badge with no direct scope of its own) when every challenge that
// awards it is itself neighborhood-scoped -- a badge earned only via
// neighborhood-scoped challenges is still neighborhood-specific in effect
// even though neighborhood_id stays null in that case.
export interface BadgeAdminItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  scope: "app_wide" | "neighborhood_specific";
  earned_via: BadgeEarnMethod[];
  challenges: BadgeAdminChallengeRef[];
}

export interface CreateBadgeRequest {
  name: string;
  description?: string | null;
  icon?: string | null;
  // null creates an app-wide badge; a string scopes it to that neighborhood
  // directly (distinct from a challenge's own scope -- see BadgeAdminItem).
  neighborhood_id?: string | null;
}

export interface UpdateBadgeRequest {
  name?: string;
  description?: string | null;
  icon?: string | null;
}

// "poi" targets one specific venue_id (still named poi_id/poi_name below for
// API stability); "any_poi" targets any POI-kind location in the
// neighborhood; "any_activity" targets a check-in anywhere in the
// neighborhood regardless of category or kind (e.g. a standing "thanks for
// visiting"). Neither "any_poi" nor "any_activity" have a category_id or
// venue_id, so category_name/poi_id/poi_name all stay null for them.
export type ChallengeTargetType = "category" | "poi" | "any_poi" | "any_activity";

export interface Challenge {
  id: string;
  // null means app-wide (BACKLOG.md Ref 108) -- the challenge applies in
  // every neighborhood rather than one specific one.
  neighborhood_id: string | null;
  title: string;
  description: string | null;
  target_type: ChallengeTargetType;
  // Populated for target_type "category" -- e.g. "Coffee Shop".
  category_name: string | null;
  // Populated for target_type "poi" -- named poi_id/poi_name for API
  // stability (a challenge still conceptually "targets a specific place"),
  // even though the backing challenge.venue_id column now points at a row
  // that could technically be either kind. Null for "any_poi".
  poi_id: string | null;
  poi_name: string | null;
  target_count: number;
  points_reward: number;
  badge: Badge | null;
  starts_at: string;
  // Null means the challenge runs indefinitely (no scheduled end).
  ends_at: string | null;
}

// GET /neighborhoods/:id/challenges -- adds the requesting user's progress
// on top of the Challenge template. progress_count is a distinct-venue count
// for category and any_poi challenges, or 0/1 for a specific-poi challenge.
export interface ChallengeProgress extends Challenge {
  progress_count: number;
  completed: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  points: number;
  rank: number;
}

export type ActivityType =
  | "checkin"
  | "favorite"
  | "badge"
  | "challenge_completion"
  | "event_follow"
  | "neighbor_connection";

// GET /neighborhoods/:id/activity (neighborhood-wide) and GET /me/feed
// (BACKLOG.md Ref 81 -- your neighbors' activity, /account's Spore Feed
// tab) share this shape. actor_name is already resolved server-side against
// the actor's profile visibility -- "A user" for a private profile,
// display_name/username/"A user" for a public one -- so the client never
// sees which private user did what, even in the Spore Feed where the
// visitor already has an accepted connection with the actor. actor_username
// is likewise only ever set for a public profile (null for "A user" rows),
// letting the web app link the actor's name to their public profile without
// exposing a private user's handle.
export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor_name: string;
  actor_username: string | null;
  // The actor's real saved mushroom customizer choice, if any -- unlike
  // actor_name/actor_username, never masked by visibility: showing someone's
  // actual mushroom *appearance* isn't identifying on its own (the same rule
  // listRecentVisitorMushroomsForNeighborhood, apps/api's
  // checkins/supabaseRepository.ts, already applies to the recent-visitor
  // mosaic), only their name is. null falls back to the row's own
  // deterministic look (resolveMushroomConfig, @blockwise/types).
  actor_mushroom_customization: MushroomCustomization | null;
  venue_id: string | null;
  venue_name: string | null;
  // Set only for "checkin"/"favorite" rows (the two types with a real
  // venue_id) -- lets the feed row's avatar cluster pick the right
  // EntityTile tint/glyph for the venue it overlaps, mirroring
  // MushroomCollectionEntry's own location_kind field. null for a legacy row
  // predating this field, same "untyped fallback" case CollectionCard
  // already handles.
  location_kind: "business" | "poi" | null;
  badge_name: string | null;
  badge_icon: string | null;
  challenge_title: string | null;
  // Set only for type "event_follow" (BACKLOG.md Ref 81) -- the followed
  // event's title, so the feed can render "X followed <event_title>"
  // without a dedicated event detail page to link to.
  event_id: string | null;
  event_title: string | null;
  // Set only for type "neighbor_connection" -- the other party in the
  // connection, masked by *their own* visibility the same way actor_name/
  // actor_username are (a private neighbor's identity stays hidden even in
  // a friend-of-a-friend's Spore Feed).
  other_user_name: string | null;
  other_user_username: string | null;
  // Mirrors actor_mushroom_customization above, for the other party in a
  // neighbor_connection row -- also never masked by visibility.
  other_user_mushroom_customization: MushroomCustomization | null;
  // Set for "checkin" / "favorite" / "challenge_completion" /
  // "neighbor_connection" rows -- each is sourced 1:1 from a `point_event`
  // row (apps/api's activity/supabaseRepository.ts), so the points it
  // awarded is already on hand. null for "badge" (a free unlock, not itself
  // a point event) and "event_follow" (not currently a point-earning action
  // at all -- see points.ts's CHECKIN_POINTS/FAVORITE_POINTS/
  // NEIGHBOR_CONNECTION_POINTS, no event-follow equivalent exists).
  points_earned: number | null;
  occurred_at: string;
}

// GET /neighborhoods/:id/happening-now -- events happening today (in
// progress, or later today) plus businesses/POIs whose cached hours say
// they're currently open. Backs the neighborhood profile's "Today" tab.
export interface OpenNowLocation {
  id: string;
  name: string;
  kind: LocationKind;
  category_name: string | null;
  // "Open now · until X" pill (BACKLOG.md Ref 101 redesign) -- every row in
  // this list is already known to be open (see getHappeningNow), so this is
  // just the closing time, formatted; null for a 24-hour location.
  closes_at: string | null;
}

export interface HappeningNow {
  today_events: Event[];
  open_now: OpenNowLocation[];
}

// GET /me/points (BACKLOG.md Ref 47) -- an all-time, all-neighborhood total,
// for the account page's profile summary card. level/points_into_level/
// points_to_next_level are computed server-side (apps/api's
// gamification/points.ts computeLevel) rather than client-side, so the
// badge rule engine's "level_reached" badges (gamification/badges.ts) and
// this response always agree on the same user's level.
export interface UserPointsSummary {
  points: number;
  level: number;
  points_into_level: number;
  points_to_next_level: number;
}

// GET /me/challenges/completed-count -- an all-time, all-neighborhood total
// of challenges this user has completed, for the account page's profile
// summary card, mirroring UserPointsSummary above.
export interface UserChallengesSummary {
  completed_count: number;
}

// GET /me/onboarding -- the "first run" checklist's five steps (join a
// neighborhood, set a username, customize your mushroom, check in
// somewhere, make a friend), each derived from data that already exists for
// its own reason (neighborhood_member rows, app_user.username/
// mushroom_customization, a checkin row, an accepted connection) rather than
// a dedicated onboarding-progress table -- so this is read-only, and there's
// nothing to explicitly mark "done" beyond doing the thing itself.
export interface OnboardingChecklist {
  has_neighborhood: boolean;
  has_username: boolean;
  has_customized_mushroom: boolean;
  has_checkin: boolean;
  has_connection: boolean;
}

// GET /me/challenges -- every challenge this user has completed, across
// every neighborhood, for the account page's Challenges tab, mirroring
// UserBadge's shape (a fixed template plus the award/completion timestamp).
export interface UserChallenge {
  id: string;
  title: string;
  description: string | null;
  // Both null for an app-wide challenge (BACKLOG.md Ref 108) -- display a
  // fallback like "App-wide" rather than a neighborhood link.
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  points_reward: number;
  badge: Badge | null;
  completed_at: string;
}

// GET /me/challenges/active -- every active, not-yet-completed challenge
// across every neighborhood this user belongs to, for the account page's
// Challenges tab, mirroring UserChallenge's shape but with live progress
// (ChallengeProgress) instead of a completion timestamp. Null for an
// app-wide challenge, same as UserChallenge.neighborhood_name above.
export interface UserChallengeProgress extends ChallengeProgress {
  neighborhood_name: string | null;
}

// Super admin's Challenges tab (BACKLOG.md Ref 108) -- a challenge with its
// scope resolved to a display name, for the admin list/table view. Creation
// only supports category- or kind-targeted challenges (never a specific
// venue) to keep the minimal admin authoring flow simple; existing
// venue-targeted rows (seeded by hand before this admin UI existed) still
// display here, just aren't creatable through it.
export interface ChallengeAdminItem {
  id: string;
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  title: string;
  description: string | null;
  target_type: ChallengeTargetType;
  category_id: string | null;
  category_name: string | null;
  poi_id: string | null;
  poi_name: string | null;
  target_count: number;
  // True for a "completionist" challenge (e.g. "Visit every POI") whose
  // real target tracks the neighborhood's current active-POI count rather
  // than a fixed number -- only meaningful when target_type is "any_poi".
  // When true, target_count above is already the live-resolved number (see
  // challenges.ts's effectiveTargetCount), not the raw stored column.
  target_count_live: boolean;
  points_reward: number;
  badge: Badge | null;
  starts_at: string;
  ends_at: string | null;
  // True once anyone has completed this challenge. A neighborhood admin
  // can no longer edit the challenge or its badge once this flips true
  // (would retroactively change what was already earned); a super admin
  // can edit regardless.
  has_completions: boolean;
}

export interface CreateChallengeRequest {
  // null creates an app-wide challenge; a string scopes it to that
  // neighborhood, same meaning as every challenge created before this admin
  // UI existed.
  neighborhood_id: string | null;
  title: string;
  description?: string | null;
  // Exactly one of category_id/target_kind must be set.
  category_id?: string | null;
  target_kind?: "poi" | "any" | null;
  target_count: number;
  // Only valid when target_kind is "poi" -- see ChallengeAdminItem's own
  // target_count_live doc comment.
  target_count_live?: boolean;
  points_reward: number;
  badge_id?: string | null;
  starts_at: string;
  ends_at?: string | null;
}

export interface UpdateChallengeRequest {
  title?: string;
  description?: string | null;
  target_count?: number;
  points_reward?: number;
  badge_id?: string | null;
  ends_at?: string | null;
}

// Super-admin Monitoring tab (BACKLOG.md Ref 104): one combined shape --
// get_monitoring_analytics returns most of these sub-arrays together in a
// single RPC call (mirroring NeighborhoodAnalytics/VenueAnalytics above);
// slowest_queries comes from a second, separately-privileged RPC
// (get_slow_queries) that SupabaseMonitoringRepository.getAnalytics merges
// in before returning, so callers still only see one method/one shape.
export interface MonitoringDailyCount {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

export interface MonitoringErrorsBySource {
  source: "api" | "web";
  count: number;
}

export interface MonitoringRecentError {
  id: string;
  source: "api" | "web";
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
  // Which deployment logged this row (e.g. "app.tryspored.com", "localhost")
  // -- null for rows logged before the domain column existed.
  domain: string | null;
  // Which shipped release logged this row (apps/api/package.json's
  // "version" at log time, e.g. "0.81.0") -- null for rows logged before
  // the app_version column existed.
  app_version: string | null;
}

export interface MonitoringLatencyByDay {
  date: string; // 'YYYY-MM-DD'
  avg_ms: number;
  p95_ms: number;
}

export interface MonitoringStatusCodeBreakdown {
  status_class: "2xx" | "3xx" | "4xx" | "5xx";
  count: number;
}

// request_log's counterpart to MonitoringRecentError: raw method/path/status/
// duration rows rather than console.error'd exceptions -- a plain 4xx/5xx
// response never reaches error_log (only an explicit console.error call site
// does), so this is how a specific 4xx/5xx from the Status codes tiles gets
// investigated.
export interface MonitoringRecentRequest {
  id: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  created_at: string;
  domain: string | null;
  app_version: string | null;
}

export interface MonitoringSlowestRoute {
  path: string;
  avg_ms: number;
  request_count: number;
}

// DB-level query latency (pg_stat_statements, get_slow_queries RPC) --
// pairs with MonitoringSlowestRoute's Express-level latency so a slow route
// can be traced to "the app" vs. "the query."
export interface MonitoringSlowQuery {
  query: string;
  calls: number;
  mean_exec_time: number;
  total_exec_time: number;
}

// Geoapify's 4 endpoints our server actually calls (apps/api/src/places/
// geoapifyClient.ts via InstrumentedPlacesClient). searchNearby/
// fetchPhotoMedia (Google's old method names) were retired in Phase 4 and
// fully removed here in Phase 7 -- their historical places_api_call_log rows
// were purged in the same migration that tightened the CHECK constraint
// (see 20260902010000_geoapify_credit_metering.sql), so there's nothing left
// that needs those values to type-check. Map tile requests (MapView.tsx/
// BoundaryMap.tsx) hit Geoapify directly from the browser and never pass
// through our instrumented server client, so there's no "mapTile" endpoint
// here -- nothing server-side could ever log one.
export type PlacesApiEndpoint = "searchPlaces" | "searchText" | "reverseGeocode" | "getPlaceDetails";

// Self-instrumented outbound Geoapify API calls (InstrumentedPlacesClient
// wraps LiveGeoapifyClient) -- not pulled from Geoapify's own dashboard, so
// this reflects what our server attempted, not Geoapify's own metering.
export interface MonitoringPlacesApiByEndpoint {
  endpoint: PlacesApiEndpoint;
  count: number;
  error_count: number;
}

// Pairs with MonitoringPlacesApiByEndpoint's error_count -- the actual
// failed calls behind that count, so a spike can be investigated rather than
// just observed. request_context/domain/app_version (20260902030000_places_
// api_call_log_enrichment.sql) fill in what error_log/request_log rows
// already carry -- which deployment logged it, which shipped version, and
// (request_context, Places-specific) what was actually requested, e.g.
// "placeId: 51d5f2d1..." for a failed getPlaceDetails call, so a "400
// Invalid Place ID" is traceable back to which place ID without a second
// lookup. Nullable since existing rows predate all three columns.
export interface MonitoringPlacesApiFailure {
  id: string;
  endpoint: PlacesApiEndpoint;
  error_message: string | null;
  request_context: string | null;
  duration_ms: number;
  created_at: string;
  domain: string | null;
  app_version: string | null;
}

// Same daily-count shape as MonitoringDailyCount, split out by endpoint --
// backs the Geoapify page's credits-over-time chart. A plain daily total
// can't be weighted into credits accurately since each endpoint has its own
// per-request credit cost (see PLACES_API_CREDIT_COST below), so the trend
// chart needs this breakdown to sum count * weight per day rather than
// guessing a blended rate.
export interface MonitoringPlacesApiCallByDayAndEndpoint {
  date: string; // 'YYYY-MM-DD'
  endpoint: PlacesApiEndpoint;
  count: number;
}

// Day-to-date call counts per endpoint, independent of the Monitoring tab's
// days/domain/version filters -- Geoapify's free tier is a *daily* credit
// pool (unlike Google's monthly one), so "how much free quota is left today"
// has to be computed against that actual boundary
// (geoapify_billing_day_start() in Postgres) regardless of which window an
// admin has picked to look at. Geoapify's docs don't state which timezone
// the daily reset happens in (unlike Google's confirmed Pacific-Time
// monthly reset), so this uses UTC midnight as the simplest reasonable
// assumption -- revisit if real usage ever shows a mismatch. Only counts
// successful calls (mirrors the guardrail in apps/api/src/places/
// quotaGuard.ts), on the same assumption Google's billing carried -- a
// failed request generally isn't metered -- which hasn't been separately
// confirmed against Geoapify's docs either.
export interface MonitoringPlacesApiDayToDate {
  endpoint: PlacesApiEndpoint;
  count: number;
}

// Geoapify's actual metering unit: credits, not dollars. Unlike Google's
// pay-per-request SKUs, Geoapify sells fixed monthly plans sized to a daily
// credit ceiling (Free = 3,000/day/$0, then $59 for 10,000/day, $109 for
// 25,000/day, ... -- see docs/location-services-comparison.md) rather than
// billing per credit consumed, so there's no real $/request rate to surface
// -- the Monitoring UI shows credits used against the daily free tier
// instead of a dollar estimate. Geoapify's real formula also grants 1 extra
// credit per 20 results beyond the first 20 on search-shaped endpoints
// (searchPlaces/searchText/reverseGeocode); places_api_call_log doesn't
// record a per-call result count, and real tiles/searches run well under 20
// results each (docs/location-services-comparison.md's usage estimate), so
// this flattens every endpoint to 1 credit/request rather than tracking
// that bonus -- a deliberate simplification, same spirit as the old
// $-estimate's "upper bound, not the actual bill" caveat.
export interface PlacesApiEndpointCredits {
  creditsPerRequest: number;
}

export const PLACES_API_CREDIT_COST: Record<PlacesApiEndpoint, PlacesApiEndpointCredits> = {
  searchPlaces: { creditsPerRequest: 1 },
  searchText: { creditsPerRequest: 1 },
  reverseGeocode: { creditsPerRequest: 1 },
  getPlaceDetails: { creditsPerRequest: 1 },
};

// Geoapify Free plan's daily credit ceiling (docs/location-services-comparison.md).
// Unlike Google's per-SKU free tiers, this is one shared pool across every
// endpoint (and map tiles, at 0.25 credit each, which never reach this
// budget check since they're never logged server-side -- see
// PlacesApiEndpoint's own comment).
export const GEOAPIFY_FREE_DAILY_CREDITS = 3000;

// Guardrail threshold (apps/api/src/places/quotaGuard.ts) for the one
// non-critical, high-frequency endpoint (getPlaceDetails) that fires on
// ordinary visitor page views rather than an admin clicking a button --
// shared with the web app so the Monitoring page's free-tier widget flags
// "guardrail active" at the same line the backend actually stops calling
// Geoapify at. Checked against the *shared* daily credit pool, not
// getPlaceDetails' own count in isolation, since Geoapify doesn't meter
// per-endpoint free tiers the way Google did.
export const PLACES_API_NEAR_LIMIT_THRESHOLD = 0.9;

export interface MonitoringAnalytics {
  // Echoes the request's window in minutes (get_monitoring_analytics'
  // p_minutes) -- minutes rather than days so the range control can offer
  // sub-day granularity (5 min / 1 hour) alongside 24h/7d/30d.
  window_minutes: number;
  errors_over_time: MonitoringDailyCount[];
  errors_by_source: MonitoringErrorsBySource[];
  recent_errors: MonitoringRecentError[];
  recent_requests: MonitoringRecentRequest[];
  request_volume_over_time: MonitoringDailyCount[];
  latency_over_time: MonitoringLatencyByDay[];
  status_code_breakdown: MonitoringStatusCodeBreakdown[];
  slowest_routes: MonitoringSlowestRoute[];
  slowest_queries: MonitoringSlowQuery[];
  places_api_calls_over_time: MonitoringDailyCount[];
  places_api_by_endpoint: MonitoringPlacesApiByEndpoint[];
  recent_places_api_failures: MonitoringPlacesApiFailure[];
  places_api_calls_by_day_and_endpoint: MonitoringPlacesApiCallByDayAndEndpoint[];
  places_api_day_to_date_by_endpoint: MonitoringPlacesApiDayToDate[];
  // Every domain (deployment) that has ever logged an error or request row,
  // regardless of the current days/domain filter -- backs the Monitoring
  // tab's domain picker (BACKLOG.md Ref 104 follow-up), so a future new
  // deployment shows up automatically once it logs anything.
  available_domains: string[];
  // The last 8 distinct shipped versions seen across error_log/request_log,
  // newest first, regardless of the current days/domain/version filter --
  // backs the Monitoring tab's version picker (BACKLOG.md Ref 104
  // follow-up).
  available_versions: string[];
}

// POST /monitoring/client-errors: the web app's React error boundaries
// (error.tsx/global-error.tsx) and window.onerror/unhandledrejection
// listener both report through this one shape.
export interface ReportClientErrorRequest {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export * from "./mushroom";
