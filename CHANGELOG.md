# Changelog

User-visible changes, newest first. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and [semver](https://semver.org/) versioning.

## [0.46.1] — 2026-07-14

### Changed

- **Business admin and neighborhood admin unified under a single `/admin` namespace, sharing one sidebar-shell UI.** `/business/:venueId` moved to `/admin/business/:venueId` and was restyled to match the neighborhood-admin shell (stat tiles, rounded cards, sidebar nav) instead of its old plain single-column layout; `/neighborhood-admin/:slug` moved to `/admin/neighborhood/:slug`. The old plain `/business` and `/neighborhood-admin` list pages were removed — an account can administer many neighborhoods and/or own many businesses (independent `account_type`/`is_neighborhood_admin` flags), so a single "your list" page no longer fit. (`apps/web/src/app/admin/business/[venueId]/`, `apps/web/src/app/admin/neighborhood/`)
- **New `/admin` landing page** redirects straight to the first neighborhood you admin, else the first business you own, else shows a "nothing to admin yet" state (become a business owner / create a neighborhood, as applicable). (`apps/web/src/app/admin/page.tsx`)
- **New `AdminSwitcher` sidebar dropdown** (replacing the old static "back to the list" card) lists every neighborhood and business the signed-in account administers, so you can jump between them without leaving either shell. (`apps/web/src/app/AdminSwitcher.tsx`)
- **`AccountNav`'s "Business portal" and "Neighborhood admin" menu items collapsed into one "Admin" link.** (`apps/web/src/app/AccountNav.tsx`)
- Extracted a shared `StatTile` component (icon/label/value stat tile) used by both admin shells' Overview tabs, and restyled the business admin's forms to match the neighborhood-admin versions' input/button treatment. (`apps/web/src/app/StatTile.tsx`)
- Marketing homepage's "Claim your business" CTAs now point at `/admin` instead of the removed `/business`. (`apps/marketing/src/app/page.tsx`)

## [0.46.0] — 2026-07-14

### Added

- **In-progress challenges on the account page.** The Challenges tab now has an "In progress" section (challenges started but not yet completed, across every neighborhood the user belongs to, sorted by percent-complete descending) above the existing "Completed" list, each with a progress bar and "X of Y" count. Backed by a new `GET /me/challenges/active` endpoint. (`apps/api/src/gamification/challenges.ts`, `apps/api/src/app.ts`, `apps/web/src/app/account/page.tsx`, `packages/types/src/index.ts`)
- **Same In progress / Completed grouping on the neighborhood page's Challenges tab**, plus a new "Not started" section listing every challenge template the user hasn't begun. (`apps/web/src/app/neighborhoods/[slug]/ChallengesView.tsx`)
- **"Everybody's Neighbor" easter-egg badge.** Connecting with @squalrus (Spored's answer to Tom, everyone's first friend on Myspace) now awards a one-off badge to the other party. (`supabase/migrations/20260714050000_squalrus_connection_badge.sql`, `apps/api/src/gamification/squalrusBadge.ts`, `apps/api/src/app.ts`)

### Changed

- **Forager level badges now use a mushroom emoji** instead of a generic star, and the "Neighbor" connection badges use a handshake emoji. (`supabase/migrations/20260714020000_forager_badge_mushroom_icon.sql`, `apps/web/src/app/BadgeIcon.tsx`)
- **"Founder" badge renamed to "Early Sprout"** with a seedling icon, and its description updated from "Blockwise" to "Spored". (`supabase/migrations/20260714030000_founder_badge_seedling_icon.sql`, `supabase/migrations/20260714040000_founder_badge_spored_rename.sql`, `apps/api/src/gamification/founderBadge.ts`)
- **Badge and challenge icon backgrounds switched from amber to purple** for better contrast — many badge/challenge emoji are yellow-heavy and blended into the previous amber circle. (`apps/web/src/app/CheckinResultCard.tsx`, `apps/web/src/app/account/page.tsx`, `apps/web/src/app/profile/[username]/page.tsx`, `apps/web/src/app/neighborhoods/[slug]/ChallengesView.tsx`)
- **Favorite venues list is now alphabetized** rather than returned in insertion order. (`apps/api/src/favorites/supabaseRepository.ts`)

### Fixed

- **Challenges that were already complete before their template existed (or before their first qualifying check-in was evaluated) now auto-complete on read**, instead of showing 100% progress forever without ever awarding points or a badge. (`apps/api/src/gamification/challenges.ts`)
- **A challenge's bonus points now count toward the same check-in's badge level-up evaluation.** Challenge completion and badge-rule evaluation ran in parallel, so a check-in that both completed a challenge and crossed a level threshold could evaluate the level badge against a stale points total; they now run sequentially. (`apps/api/src/gamification/rewards.ts`)

## [0.45.0] — 2026-07-14

### Added

- **Mushroom avatar customizer.** Completes BACKLOG.md Ref 75. A new always-visible "Mushroom avatar" section in Account Settings (a sibling to Profile, independent of which avatar style is currently active) lets a signed-in user override their hash-derived mushroom look with a deliberate choice: cap, stalk, spots, and background colors, plus spot count (0–6) and spot shape. A live preview updates as swatches are picked; "Use auto-assigned look" reverts to the hash-derived default. Saved as a new nullable `app_user.mushroom_customization` jsonb column, validated server-side against the same approved palette the customizer offers (amber stalk/spots/background only paired with a Cocoa cap, mirroring auto-assignment's own contrast rule) — `PATCH /me/profile` accepts and clears it independently of other profile fields. Falls back to the existing hash-derived auto-assignment (`mushroomConfigForUser`) whenever nothing's been saved. The saved look renders everywhere an avatar already did: the account page, the top nav, the neighborhood-admin sidebar, the neighbors list, public profiles, the business-claims list, and the check-in slider's thumb (previously a generic fixed icon). (`supabase/migrations/20260714010000_mushroom_customization.sql`, `apps/web/src/app/account/MushroomSection.tsx`, `.../MushroomCustomizer.tsx`, `apps/api/src/app.ts`, `apps/api/src/auth/*.ts`, `packages/types/src/index.ts`)

### Changed

- **Spot pattern system redesigned as two independent choices: count and shape.** Replaced the six fused named patterns (none/solo/classic/rings/sparks/halftone) with an independent spot count (0–6) and spot shape — any count now pairs with any shape, rather than each pattern name baking in both. Added three new shapes (star, triangle, cross) alongside the existing circle/ring/sparks, for six total. `MushroomMark`'s `pattern` prop and `SporePattern` type are gone, replaced by `spotCount`/`spotShape`/`SpotShape` everywhere (mushroom auto-assignment, the customizer, the API, and the `/brand` page's examples). (`packages/ui/src/MushroomMark.tsx`, `packages/ui/src/mushroomConfig.ts`)
- **Stalk, spots, and background are now independently colorable**, instead of spots always mirroring the stalk color and background tint going unused by every avatar. The shared accent palette grew from 3 colors (Cream, Cocoa, Amber) to 9 (added Wheat, Meadow, Lilac, Oat, Sage, Mist, Clay), and the cap palette grew from 5 to 8 (added Indigo, Russula, Blusher). (`packages/ui/src/mushroomConfig.ts`, `packages/ui/src/colors.ts`)
- **Background shape (circle vs. squircle) option removed.** It was documented on the brand page but never actually offered by any avatar surface; `MushroomMark`'s `bgShape` prop and the brand-page community mosaic's random square backgrounds are gone, so every mushroom background renders as a circle. (`packages/ui/src/MushroomMark.tsx`, `apps/marketing/src/app/brand/BrandMushroom.tsx`)
- **`/brand` guidelines page overhauled** to match all of the above and to fix several stale/incorrect details found along the way: logo-lockup stem colors fixed for contrast against their card backgrounds, Chanterelle orange replaces Golden/Amber as the primary cap color throughout (nav, favicon, lockups, reversed-on-dark card), a new "Spot count & shape" section replaces the old fixed 6-pattern grid, the Anatomy section's four part-cards now describe the actual independent color choices instead of stale "cream or cocoa"/"circle or squircle" text, and the "your mushroom" section no longer claims per-user customization isn't exposed. (`apps/marketing/src/app/brand/page.tsx`, `apps/marketing/src/app/brand/BrandMushroom.tsx`, `apps/marketing/src/app/MarketingNav.tsx`)
- **Favicon and app icon regenerated** for both apps (`icon.svg`, `apple-icon.png`, `favicon.ico`) with the Chanterelle cap and cream spots/stem, replacing the old golden cap. (`apps/marketing/src/app/{icon.svg,apple-icon.png,favicon.ico}`, `apps/web/src/app/{icon.svg,apple-icon.png,favicon.ico}`)
- **Marketing homepage's decorative floating "spores" now vary spot count and shape** via the real generator instead of one fixed pattern repeated in different cap colors, and its phone-mockup nav logo and the real app's header logo (`AccountNav`) both switched from amber to orange to match the rest of the refresh. (`apps/marketing/src/app/page.tsx`, `apps/web/src/app/AccountNav.tsx`)

## [0.44.1] — 2026-07-13

### Changed

- **Neighborhood-admin dashboard redesigned as a standalone sidebar shell.** Imported from a Claude Design mockup ("Spored Admin") and completes BACKLOG.md Ref 31 "SimCity-style UI redesign for neighborhood management." `/neighborhood-admin/:slug/*` now renders its own dark sidebar (logo, neighborhood switcher, Overview/Boundary/Locations/Business claims nav with live location and pending-claim counts, "View public page" link) instead of the site's usual AccountNav/Footer plus a pill tab bar — a new `SiteChrome.tsx` hides the site chrome specifically for these routes. The Overview tab gained stat tiles (businesses, points of interest, members, check-ins, sourced from the existing public neighborhood-profile counts) and a status callout linking to pending claims. Visual-only within the four existing tabs — no schema or new API routes; `apps/web` also gained the `jetbrains-mono` font (already used on the marketing brand page) wired into the root layout for the new mono-styled labels. (`apps/web/src/app/SiteChrome.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/layout.tsx`, `.../page.tsx`, `.../boundary/page.tsx`, `.../claims/page.tsx`, `.../locations/page.tsx`, `.../DescriptionForm.tsx`, `.../SocialLinksForm.tsx`, `.../EventForm.tsx`)
- **Locations tab: category filter chips (with optional subcategory refinement) and a standalone "Show hidden" toggle.** Partially completes BACKLOG.md Ref 56, folded into the redesign above since the tab's markup was already being touched. New category-group filter chips (business-kind rows only, since POIs use a free-text `type` rather than the category taxonomy) sit alongside the kind toggle, now a 3-way All/Businesses/POIs control (counts unaffected by hidden visibility) rather than the old 4th "Hidden" option — hidden-row visibility is a separate toggle (defaults on) that combines with whichever kind is selected, so hiding a row from e.g. the Businesses view doesn't force a tab switch just to keep seeing it in place (dimmed, with its "Hidden" badge). Ref 56 also proposed excluding hidden rows from "All" by default; decided against for the same reason. Selecting a category-group chip (e.g. "Food & Drink") now reveals a second row of that group's leaf categories (e.g. "Coffee Shop", "Bar") to optionally narrow further; resets whenever the group selection changes. Purely client-side; no API/schema changes. (`apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/page.tsx`)

### Fixed

- **`TabNav`'s active-tab text contrast in dark mode.** The active pill used `--ink` (an always-dark color) for its text against a dark active background, making it unreadable in dark mode; switched to `--on-accent`, which flips per theme. (`apps/web/src/app/TabNav.tsx`)
- **OAuth callback redirect.** Signing in via Google no longer routes business accounts to `/business` — everyone lands on `/account`, which already surfaces a business-portal link for business accounts, giving a consistent post-login landing regardless of account type. (`apps/web/src/app/auth/callback/page.tsx`)
- **Boundary map not fitting the saved shape on load.** `BoundaryMap` always opened at a fixed `zoom: 15` centered on the neighborhood's center point, regardless of how large or irregular the saved boundary actually was — a large neighborhood's polygon could extend past what's visible without the admin realizing it. The map now calls `fitBounds()` over the polygon's vertices (with a small padding) when an existing boundary loads, so the whole shape is in view immediately. (`apps/web/src/app/neighborhood-admin/BoundaryMap.tsx`)
- **Switching a business to a point of interest silently failed.** The Locations tab's "→ POI" action never sent a `type` (park, landmark, transit, etc.), which `PATCH .../locations/:id/kind` requires when switching to POI kind (a business has no `type` of its own to fall back on) — every attempt 400'd with "type is required to switch to a point of interest," shown only as a small error line elsewhere on the page, so the row appeared to just do nothing. The action now prompts for a type before submitting; the switch was otherwise implemented correctly (pre-dates this version, first introduced with kind-switching itself). Also gave the "POI" kind badge its own green treatment instead of sharing "Business"'s neutral gray pill, so a successful switch is visually obvious. (`apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/page.tsx`)
- **Locations tab's reassign-category dropdown wasn't alphabetical.** Partially addresses BACKLOG.md Ref 57 — the dropdown listed categories in the API's bare-leaf-name order, but the label actually shown is `"{group} / {name}"`, so the on-screen order didn't read as alphabetical once categories from different groups interleaved. Now sorted client-side by that same composed label. The review wizard's classification picker (`locations/review/page.tsx`) and the dark-mode option-contrast half of Ref 57 remain open. (`apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/page.tsx`)

## [0.44.0] — 2026-07-13

### Added

- **Google Analytics 4 on both apps.** apps/marketing and apps/web each report to their own GA4 property/data stream (kept separate since marketing traffic is anonymous/conversion-funnel-focused while in-app usage is authenticated/feature-usage-focused), via `@next/third-parties`'s `GoogleAnalytics` component. Gated behind `NEXT_PUBLIC_GA_MEASUREMENT_ID`, which is left unset in local dev so `npm run dev`/local builds never report traffic. Completes BACKLOG.md Ref 68/69. (`apps/marketing/src/app/layout.tsx`, `apps/web/src/app/layout.tsx`, `apps/marketing/.env.example`, `apps/web/.env.example`)
- **Marketing site SEO.** apps/marketing gained `metadataBase`/OpenGraph/Twitter card defaults, a `robots.txt` (allow all), a sitemap covering every static route, per-page canonical URLs, and `Organization` JSON-LD structured data on the homepage. Completes BACKLOG.md Ref 67. (`apps/marketing/src/app/layout.tsx`, `apps/marketing/src/app/page.tsx`, `apps/marketing/src/app/robots.ts`, `apps/marketing/src/app/sitemap.ts`, `apps/marketing/src/lib/siteUrl.ts`)
- **App-wide SEO.** apps/web gained `metadataBase`/OpenGraph/Twitter card defaults, a `robots.txt` disallowing authenticated/utility routes (account, business, neighborhood-admin, admin, etc.) and the "/" auth-redirect stub, and a dynamic sitemap covering every active neighborhood and its active business venues. Neighborhood, location, and profile pages gained per-page `generateMetadata` (title/description/canonical), and business-kind location pages gained `LocalBusiness` JSON-LD. Public profile pages default to `noindex,follow` since most of their content is gated behind an accepted neighbor connection. Completes BACKLOG.md Ref 70. (`apps/web/src/app/layout.tsx`, `apps/web/src/app/robots.ts`, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/neighborhoods/[slug]/layout.tsx`, `apps/web/src/app/neighborhoods/[slug]/*/page.tsx`, `apps/web/src/app/location/[id]/page.tsx`, `apps/web/src/app/profile/[username]/page.tsx`, `apps/web/src/lib/siteUrl.ts`)
- **Terms of Service and Privacy Policy pages.** New static `/terms` and `/privacy` pages on apps/marketing, describing account/check-in/location data handling, third-party processors (Supabase, Google, Netlify, GA4), and user choices, sharing a new `LegalLayout` shell. Linked from the marketing footer. Completes BACKLOG.md Ref 63/64. (`apps/marketing/src/app/terms/page.tsx`, `apps/marketing/src/app/privacy/page.tsx`, `apps/marketing/src/app/LegalLayout.tsx`, `apps/marketing/src/app/MarketingFooter.tsx`)

### Changed

- **CLAUDE.md gained a "Keeping Terms/Privacy current" section**, flagging that the new Terms/Privacy pages describe specific product behavior (data collected, third-party processors, sharing/deletion) that must be kept in sync with future changes, not evergreen boilerplate.

## [0.43.0] — 2026-07-13

### Added

- **Spore Feed stub tab on /account.** The account page's first tab, defaulting on page load, with a placeholder hint for a future activity feed. Opens the door for downstream work aggregating neighbor/neighborhood activity (check-ins, favorites, badge unlocks). (`apps/web/src/app/account/page.tsx`)
- **Progress bars on completed challenges.** The /account Challenges tab now shows a full-width progress bar for each completed challenge (always filled to 100% for visual consistency with the neighborhood challenges view). (`apps/web/src/app/account/page.tsx`, `apps/web/src/app/CheckinResultCard.tsx`)
- **Latest badge and challenge on public profiles.** A public profile (`/profile/:username`) now displays the person's single most-recent badge and most-recent completed challenge, each in a full-width row matching the `/account` page's treatment (icon + name + description, neighborhood/points/timestamp for challenges). Backed by extending `GET /users/:username` to return a full `challenges: UserChallenge[]` list (replacing the old count-only `challenges_summary`). (`apps/web/src/app/profile/[username]/page.tsx`, `apps/api/src/app.ts`, `packages/types/src/index.ts`)
- **Join/leave neighborhoods from profile pages.** Each neighborhood listed on a public profile now includes a quick-action button (reusing the existing `JoinNeighborhoodButton` component) showing "✓ Joined", "Join neighborhood", or "Log in to join" depending on the viewer's auth state and membership. (`apps/web/src/app/profile/[username]/page.tsx`)
- **Unlock card animations in check-in results.** When a check-in unlocks badges or completes challenges, each full-width unlock card now slides down from behind the "Checked in ✓ +N pts" line with a staggered 140ms delay, reading as though emerging from underneath rather than fading in place. Controlled by a new `.unlock-card` CSS animation. (`apps/web/src/app/CheckinResultCard.tsx`, `apps/web/src/app/globals.css`)

### Changed

- **Profile details gating on public profiles.** A public profile's Badges, Neighborhoods, and Recent check-ins sections are now visible only to accepted neighbors (or the profile owner themselves viewing their own profile) — unsigned-in visitors and non-neighbors see a short "Add this person as a neighbor to see their badges, neighborhoods, and check-ins" hint instead. Implemented via a new `ProfileDetails` client component that checks the viewer's neighbor status server-side. (`apps/web/src/app/profile/[username]/ProfileDetails.tsx`, `apps/web/src/app/profile/[username]/page.tsx`)
- **Check-in result card height enforcement.** The flip-card container now explicitly enforces a minimum height (84px, matching the original slider's height) so a short success message (no badges) or error message never renders shorter than the control it replaced — the card is guaranteed to stay the same size or grow, never shrink. Both the outer grid and inner result cards now use `h-full` and `justify-center` to stretch and center content. (`apps/web/src/app/SlideToCheckIn.tsx`, `apps/web/src/app/CheckinResultCard.tsx`)
- **Full-width badge and challenge cards in check-in results.** The "Checked in" notification now shows any unlocked badges and challenges as full-width rows (icon + name + description, or title + points + badge) instead of small pill-shaped chips, surfacing more context and matching the same row treatment across `/account` and public profiles. (`apps/web/src/app/CheckinResultCard.tsx`)

### Fixed

- **`GET /users/:username` response shape.** Replaced the count-only `challenges_summary` field with a full `challenges: UserChallenge[]` list (every challenge the user completed, across all neighborhoods), mirroring the shape of the already-present `badges: UserBadge[]` field. This change enables public profiles to surface the user's latest challenge in full-width row format. (`apps/api/src/app.ts`, `packages/types/src/index.ts`)

## [0.42.0] — 2026-07-12

### Added

- **Connect with other users ("neighbors").** A mutual, request-based relationship between two accounts — deliberately called a "neighbor" rather than a "friend" throughout the UI. Send a request by username from a public profile page's new upper-right button (mirrors the neighborhood profile's Join button: "+ Add neighbor" → "Requested" → "✓ Neighbors", or "Accept request" when the other side already asked first); if both sides already have a pending request out to each other, the second one auto-accepts instead of leaving two rows pointed at each other. The account page gained a Neighbors section (add by username, accept/decline incoming requests, cancel outgoing ones, remove existing connections), and `ProfileSummaryCard` gained a 6th stat tile showing the neighbor count on both the account page and public profiles (a plain count only — like `favorite_count`, the connection list itself stays private to the two parties). New `user_connection` table; new `POST/GET /me/connections`, `POST /me/connections/:id/accept`, `DELETE /me/connections/:id` endpoints. Completes BACKLOG.md Ref 14 ("Connect with other users") and Ref 33 ("Friends/neighbors on profile"). (`supabase/migrations/20260712010000_user_connections.sql`, `apps/api/src/connections/`, `apps/api/src/app.ts`, `apps/web/src/app/account/NeighborsSection.tsx`, `apps/web/src/app/profile/[username]/NeighborRequestButton.tsx`, `apps/web/src/app/account/ProfileSummaryCard.tsx`, `packages/types/src/index.ts`)
- **Points and badges for connecting with a neighbor.** Accepting a neighbor connection now awards 5pts to each side (first-time-only per pair, so removing and re-adding the same neighbor doesn't re-earn it), plus a new tier of "Good Neighbor" badges at 1, 5, 10, 15, … 50 accepted connections, evaluated independently of the check-in-triggered badge rule engine. `point_event.neighborhood_id` is now nullable, since a neighbor connection isn't scoped to any neighborhood. (`supabase/migrations/20260712020000_neighbor_connection_rewards.sql`, `apps/api/src/gamification/points.ts`, `apps/api/src/gamification/badges.ts`, `apps/api/src/gamification/rewards.ts`, `apps/api/src/gamification/repository.ts`)

### Changed

- **Neighborhood activity feed links actor and venue separately.** A row like "Chad S checked in at Uma Clinic" now renders as two independent links — the actor's name to their public profile (only when their profile is public; a masked "A user" row stays plain text), and the venue/POI name to its location page — instead of the whole sentence linking to just the venue. Backed by a new `actor_username` field on `GET /neighborhoods/:id/activity`, set only for a public-visibility actor. (`apps/web/src/app/neighborhoods/[slug]/activity/page.tsx`, `apps/api/src/activity/activity.ts`, `packages/types/src/index.ts`)

## [0.41.1] — 2026-07-12

### Added

- **Neighborhood and location summary cards.** `NeighborhoodSummaryCard` and `LocationSummaryCard` extract the neighborhood and business/POI detail pages' header blocks into standalone, self-contained components (own `rounded-2xl bg-card-alt` card background, matching `ProfileSummaryCard`), so all three profile summary cards can be reviewed side by side on `/dev/components`. (`apps/web/src/app/neighborhoods/[slug]/NeighborhoodSummaryCard.tsx`, `apps/web/src/app/location/[id]/LocationSummaryCard.tsx`, `apps/web/src/app/dev/components/page.tsx`)
- **Growing-mushroom fields on neighborhood and location cards.** Both new cards grow a mushroom field like the account card, scaled from `sqrt(checkin_count)` instead of level. Unlike the account card's single repeated skin, each mushroom in a neighborhood/location field gets its own distinct skin — reading as a mosaic of the different people who checked in there, via a new `distinctMushrooms` option on the shared field renderer. (`apps/web/src/app/MushroomField.tsx`)
- **Check-in and favorite counts on the location card.** Both business and POI cards now show Check-ins and Favorites stat tiles side by side (previously only POIs showed a check-in count, and businesses showed neither). Backed by a new `favorite_count` field on `GET /locations/:id`, computed the same way `checkin_count` already was. (`apps/api/src/locations/supabaseRepository.ts`, `apps/api/src/locations/locations.ts`, `packages/types/src/index.ts`)

### Changed

- **`MushroomField` extracted as a shared component.** The scatter/cap/render logic previously inlined in `ProfileSummaryCard` now lives in its own component so the neighborhood, location, and account cards all grow their fields the same way instead of three copies of the same code. (`apps/web/src/app/MushroomField.tsx`, `apps/web/src/app/account/ProfileSummaryCard.tsx`)

## [0.41.0] — 2026-07-12

### Added

- **Mushroom avatars.** Every account now has a randomly-assigned mushroom "skin" (cap color, stalk color, spot pattern), deterministic from the account id so it's stable across sessions without any new data to store. On `/account/settings`, avatar choice is now a picker between that mushroom and the account's social sign-in photo, rather than a free-text URL field — closing off an explicit-content risk where a user could point their avatar at any arbitrary image on the web. `PATCH /me/profile` no longer accepts `avatar_url` at all; it's now read-only, seeded once from the OAuth provider at signup. (`packages/ui/src/MushroomMark.tsx`, `packages/ui/src/mushroomConfig.ts`, `apps/web/src/app/Avatar.tsx`, `apps/web/src/app/account/ProfileForm.tsx`, `supabase/migrations/20260711010000_avatar_style.sql`, `packages/types/src/index.ts`, `apps/api/src/auth/`)
- **Growing-mushroom level field on the profile summary card.** A muted green field now grows along the bottom of `ProfileSummaryCard`, with one little mushroom (in the account's own mushroom skin, scattered at random-but-stable positions) for every level reached. (`apps/web/src/app/account/ProfileSummaryCard.tsx`)
- **Badges and Challenges stats on the profile summary card.** The card's stat row grew from 3 tiles (Favorites, Check-ins, Points) to 5, adding a Badges count and an all-time Challenges-completed count. Backed by a new `GET /me/challenges/completed-count` endpoint and repository method, since no existing query returned a user's lifetime completed-challenge count. (`apps/api/src/app.ts`, `apps/api/src/gamification/challenges.ts`, `apps/api/src/gamification/repository.ts`, `apps/web/src/app/account/ProfileSummaryCard.tsx`)
- **Profile summary card on public profiles.** `/profile/:username` now renders the same `ProfileSummaryCard` used on the account page, rather than a bespoke header. `GET /users/:username` was extended with `checkin_count`, `favorite_count` (a count only — favorited venues themselves stay private), `points_summary`, `challenges_summary`, and `avatar_style` to support it. (`apps/web/src/app/profile/[username]/page.tsx`, `apps/api/src/app.ts`, `packages/types/src/index.ts`)

### Changed

- **`MushroomMark` shared between the brand guidelines page and per-user avatars.** The full four-part mushroom renderer (previously a marketing-only `BrandMushroom` component) moved to `packages/ui` so both the `/brand` anatomy illustration and mushroom avatars render from one source of truth. (`packages/ui/src/MushroomMark.tsx`, `apps/marketing/src/app/brand/BrandMushroom.tsx`)

## [0.40.0] — 2026-07-11

### Added

- **Badge rule engine.** ~45 new badges are now earned automatically from standalone rules evaluated on every check-in, fully independent of challenges (no shared code or foreign key — a badge can be challenge-only, rule-driven, or manually awarded, and never more than one at a time). Five rule types: category milestones (1/5/10 distinct check-ins for coffee shops, restaurants, bars, bakeries, dessert spots, breweries, wineries), POI milestones (1/5/10 distinct points of interest), daily distinct venues (5 through 50 in steps of 5), same-venue-repeat-in-a-day, and one badge per level (1 through 10). Badge rules are global (not neighborhood-scoped) and never expire, matching how the account page already aggregates badges across every neighborhood. Completes BACKLOG.md Ref 61 ("Badge catalog endpoint"). (`supabase/migrations/20260710050000_badge_rule_engine.sql`, `apps/api/src/gamification/badges.ts`, `apps/api/src/gamification/repository.ts`)
- **`GET /badges` catalog endpoint.** Returns every badge that exists, not just ones a user has earned, so the account page can show locked badges (dimmed, dashed outline) as a preview of what's achievable alongside earned ones. (`apps/api/src/app.ts`, `apps/web/src/app/account/page.tsx`)
- **Check-in result card.** Sliding to check in now flips the control over (a real CSS 3D transform, not a redirect) to reveal what happened — success plus any points/badges/challenges just unlocked, or a too-far/cooldown/error message with a tap-to-retry affordance. The control's height now auto-fits whichever face (slider or result) is taller, so a result with several badge chips doesn't overflow. (`apps/web/src/app/SlideToCheckIn.tsx`, `apps/web/src/app/CheckinResultCard.tsx`, `apps/web/src/app/useCheckIn.ts`)
- **"Visit any POI" and "Visit every POI" challenges.** A new challenge target (`target_kind`) lets a challenge be satisfied by checking into *any* point of interest in the neighborhood rather than one specific venue — used to convert the old single-venue "Explore Woodland Park" into "Visit any POI" and to add a new "Visit every POI" challenge (target count computed from the neighborhood's current active POI count). (`supabase/migrations/20260710030000_challenge_any_poi_target.sql`, `apps/api/src/gamification/challenges.ts`, `packages/types/src/index.ts`)
- **Indefinite challenges.** `Challenge.ends_at` can now be null for a challenge with no scheduled end — used for the new evergreen "Thanks for Visiting Phinneywood" challenge (completed by a single check-in anywhere in the neighborhood) instead of a far-future placeholder date. (`supabase/migrations/20260710040000_summer_series_and_indefinite_challenges.sql`)
- **Summer Series challenges.** Coffee Crawl, Visit any POI, and Visit every POI now share a summer-long window (July 1 – Sept 22), joined by four new category challenges (Bar Hop, Bakery Tour, Taste of Phinneywood, Retail Therapy) with matching badges. (`supabase/migrations/20260710040000_summer_series_and_indefinite_challenges.sql`)
- **Internal component library page.** `/dev/components` (not linked from any nav) renders real production components — e.g. `PlaceListItem` + `SlideToCheckIn` — pinned to specific states (too far, API failed, success with 0/1/4 badges, challenge complete, challenge complete + badges) via a dev-only `mockResolution` prop, so every check-in outcome can be reviewed side by side and by actually sliding, without a live backend. (`apps/web/src/app/dev/components/page.tsx`)

### Changed

- **Check-in points/challenges/badges response.** `POST /locations/:id/checkins` now returns a `rewards` object (points earned, challenges completed, badges earned) alongside the check-in itself, replacing a bare check-in response that gave the client no way to show what a check-in unlocked. (`apps/api/src/gamification/rewards.ts`, `packages/types/src/index.ts`)
- **User level moved server-side.** `GET /me/points` now returns `level`/`points_into_level`/`points_to_next_level` computed by the API, so the account page and the new level-reached badges always agree on the same number instead of each computing it independently client- and server-side. (`apps/api/src/gamification/points.ts`, `apps/web/src/app/account/ProfileSummaryCard.tsx`)

## [0.39.0] — 2026-07-10

### Added

- **Happening now tab.** New default tab on the neighborhood profile page showing events currently in progress plus businesses/POIs that are open right now, per a new `isOpenNow` parser over each location's cached weekday hours text. Completes BACKLOG.md Ref 27 ("What's happening now"). (`apps/api/src/locations/hours.ts`, `apps/api/src/locations/happeningNow.ts`, `apps/web/src/app/neighborhoods/[slug]/page.tsx`)
- **Recent activity tab.** New tab showing a neighborhood-wide feed of the ~50 most recent check-ins, favorites, challenge completions, and badge unlocks across every user, with actor names shown for public profiles and masked to "A user" for private ones. Uses the same dot-and-line `Timeline` UI as the account/profile pages' "Recent check-ins". (`apps/api/src/activity/`, `apps/web/src/app/neighborhoods/[slug]/activity/`, `apps/web/src/app/Timeline.tsx`)
- **Manage button for neighborhood admins.** The neighborhood profile page now shows a "Manage" button next to "Joined" for a signed-in user who administers that specific neighborhood, linking straight into its admin dashboard. (`apps/web/src/app/neighborhoods/[slug]/ManageNeighborhoodButton.tsx`)

### Changed

- **Upcoming events tab now includes business events.** `GET /neighborhoods/:id/events` merges neighborhood-owned events with events from businesses in the neighborhood, sorted by start time; `Event` gained a `venue_name` field so the tab can show which business is hosting. (`apps/api/src/events/`, `packages/types/src/index.ts`)
- **Venues tab renamed to Locations and merged with Points of interest.** `/neighborhoods/:slug/venues` is now `/neighborhoods/:slug/locations` (no redirect) and shows both businesses and neighborhood-owned POIs in one list/map, folding in what was the standalone Points of interest tab. POIs with no cached lat/lng (BACKLOG.md Ref 51) are excluded from the merged list rather than plotted at a bogus position. (`apps/web/src/app/neighborhoods/[slug]/locations/`)
- **Challenges and Leaderboard merged into one tab.** Challenges are shown on top with the points leaderboard below, replacing what were two separate tabs. (`apps/web/src/app/neighborhoods/[slug]/challenges/page.tsx`)
- **Neighborhood tab navigation uses client-side routing.** The subnav now uses `next/link` instead of plain anchor tags, so switching tabs no longer triggers a full browser page reload and Next.js can prefetch each tab in the background; navigation also skips the default scroll-to-top so it doesn't read as a full reload. (`apps/web/src/app/neighborhoods/[slug]/NeighborhoodTabs.tsx`)
- **`CheckinTimeline` extracted onto a shared `Timeline` component.** No visual change on the account/profile pages — the dot-and-connecting-line layout moved into a reusable component now also used by the Recent activity tab. (`apps/web/src/app/CheckinTimeline.tsx`, `apps/web/src/app/Timeline.tsx`)

### Removed

- **Standalone Points of interest tab.** Folded into the renamed Locations tab above. (`apps/web/src/app/neighborhoods/[slug]/pois/`)

## [0.38.0] — 2026-07-10

### Added

- **POI enrichment parity with venues.** Businesses and points of interest are now served by the same enrichment system, so a POI's detail page shows the same ratings/hours/photos/reviews a venue gets — previously only venues received enrichment from Google Places even though both can link to the same Place ID. Backed by a generalized `venue_enrichment_cache` supporting either kind and new `GET /locations/:id` endpoints replacing the separate `GET /venues/:id` + `GET /pois/:id`. Completes BACKLOG.md Ref 59. (`apps/api/src/enrichment/`, `supabase/migrations/20260710010000_poi_enrichment_parity.sql`)
- **Claim revoke action for neighborhood admins.** An already-approved business claim can now be un-approved via a new `POST /neighborhood-admin/neighborhoods/:id/claims/:claimId/revoke` endpoint, needed to unblock switching a claimed business to POI kind (which is never allowed while claimed). The admin interface shows a "Revoke" button on approved claims. Completes BACKLOG.md "POIs and venues managed almost the same". (`apps/api/src/claims/claims.ts`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/claims/page.tsx`)
- **In-place location kind switching.** Admins can now switch an existing location between business and POI kind in a single action via `PATCH /neighborhood-admin/neighborhoods/:id/locations/:locationId/kind`, replacing the old workflow of hiding a venue and recreating it as a POI. Blocked (409) if the location is currently claimed. (`apps/api/src/app.ts`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/page.tsx`)

### Changed

- **Venue and POI merged into a single location entity.** The separate `poi` table is gone; both businesses and neighborhood-owned points of interest now live in the `venue` table with a `kind` column (`'business' | 'poi'`), so switching kinds is a single in-place `UPDATE` instead of a hide-then-recreate workflow. All dependent tables (`checkin`, `point_event`, `challenge`, `venue_enrichment_cache`) now use a single `venue_id` column instead of nullable `venue_id`/`poi_id` pairs. Type system updated: `Venue` now includes `kind`, `type`, and `description` fields (previously POI-only), and separate `Poi` / `PoiDetail` types were removed. Completes BACKLOG.md Ref 45 ("POIs and venues managed almost the same"). (`supabase/migrations/20260710010000_poi_enrichment_parity.sql`, `supabase/migrations/20260710020000_merge_venue_poi.sql`, `packages/types/src/index.ts`, `apps/api/src/locations/`, `apps/web/src/app/location/`)
- **Public routes consolidated from two detail pages to one.** `/venues/:id` and `/pois/:id` merged into a single `/location/:id` route that branches on `kind` to show the appropriate UI — claim form/social links/announcements/events for businesses, type/description for POIs. (`apps/web/src/app/location/`)
- **API detail endpoint merged.** `GET /venues/:id` and `GET /pois/:id` merged into `GET /locations/:id`, returning the merged `VenueDetail` type (no separate `PoiDetail`). `GET /locations/:id/photo` replaces both `/venues/:id/photo` and `/pois/:id/photo`. (`apps/api/src/app.ts`)
- **Admin location routes consolidated.** Separate `/neighborhood-admin/neighborhoods/:id/venues*` and `/neighborhood-admin/neighborhoods/:id/pois*` routes merged into unified `/neighborhood-admin/neighborhoods/:id/locations*`, with all actions (create, read, update, delete, status change, category reassign) on both kinds in one place and with consistent naming. New `PATCH .../locations/:locationId/kind` action replaces the old "Convert to POI" hide-and-recreate workflow. (`apps/api/src/app.ts`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/`)
- **Generalized enrichment module.** The separate `apps/api/src/venues/enrichment.ts` and `apps/api/src/venues/supabaseDetailRepository.ts` modules are replaced by a unified `apps/api/src/enrichment/` module serving both location kinds. (`apps/api/src/enrichment/`)
- **URL map updated.** Every route change reflected in `docs/url-map.md`, including the new History section documenting the full scope of the venue/POI merge. (`docs/url-map.md`)

### Removed

- **Separate `/venues/:id` and `/pois/:id` detail pages.** Both merged into `/location/:id`; no redirects (pre-launch). (`apps/web/src/app/pois/[id]/`, `apps/web/src/app/venues/[id]/`)
- **Category mapping module.** Responsibility folded into the generalized `locations/` domain. (`apps/api/src/categoryMapping/`)
- **POI-specific repository files.** `apps/api/src/pois/`, `apps/api/src/venues/detailRepository.ts`, and enrichment-specific files merged into `apps/api/src/locations/` and `apps/api/src/enrichment/`. (`apps/api/src/pois/`, `apps/api/src/venues/enrichment.ts`, `apps/api/src/venues/supabaseDetailRepository.ts`)

## [0.37.0] — 2026-07-10

### Added

- **Brand guidelines page.** A new `/brand` page on the marketing site documents the Spored mark's four-part anatomy (cap, spot pattern, stalk, background), logo lockups (horizontal/reversed/stacked/mark-only), the six spot patterns (none/solo/classic/rings/sparks/halftone), the full color palette, favicon/app-icon usage, a generated-identity concept preview (per-user/neighborhood mushrooms, community mosaics), and do/don't usage rules. Imported from the "Spored: Mycelial Network Design" Claude Design project. (`apps/marketing/src/app/brand/`)

### Changed

- **Mushroom logo now shows its spot pattern.** `MushroomLogo` (used for the nav logo, map/list pins, and the slide-to-check-in thumb across both apps) previously rendered as a plain cap and stem; it now includes the brand system's "classic" three-spot pattern on the cap, colored to match the stem, bringing every existing usage in line with the documented mark anatomy without any call-site changes. (`packages/ui/src/MushroomLogo.tsx`)
- **New favicon and app icon everywhere.** Replaced the default Next.js favicon in both `apps/web` and `apps/marketing` with the brand's golden-cap-on-cocoa-squircle mark (`icon.svg`, regenerated `favicon.ico`, and a new `apple-icon.png` for iOS home-screen/bookmark icons). Both apps' mobile browser chrome (`theme-color`) now matches the brand's cocoa nav color instead of defaulting to white. (`apps/web/src/app/`, `apps/marketing/src/app/`)
- **Marketing nav/footer extracted into shared components.** With a second real page (`/brand`) now sharing the homepage's chrome, the sticky nav and footer moved out of `page.tsx` into `MarketingNav.tsx`/`MarketingFooter.tsx`; the nav gained a "Brand" link. (`apps/marketing/src/app/MarketingNav.tsx`, `apps/marketing/src/app/MarketingFooter.tsx`, `apps/marketing/src/app/page.tsx`)
- **JetBrains Mono added as a brand typeface.** Used for the small mono-styled labels (spec numbers, hex codes, captions) on the new brand guidelines page. (`packages/ui/src/fonts.ts`)

## [0.36.0] — 2026-07-09

### Added

- **Marketing site separated from the app.** The marketing homepage moves out of `apps/web` into a new standalone `apps/marketing` Next.js app, deployed as its own Netlify site to `tryspored.com` — `apps/web` becomes `app.tryspored.com`-only, clearing the way for upcoming terms/privacy/brand/FAQ/changelog pages to live alongside the homepage instead of inside the app. `apps/web`'s `/` now redirects to `/account` (signed in) or `/login` (signed out) instead of showing marketing content, and `SiteChrome.tsx` (which existed only to hide app chrome on that route) was removed. `MushroomLogo` and the brand fonts/colors moved into a new shared `packages/ui` package consumed by both apps. (`apps/marketing/`, `packages/ui/`, `apps/web/src/app/page.tsx`, `apps/web/src/app/layout.tsx`)
- **Dedicated `/checkin` page for quick access.** The account page's "Check in nearby" section (nearest-venue list + slide-to-check-in) moved to its own `/checkin` route, and the nav gained a check-in icon button (signed in only) next to the hamburger menu — checking in no longer requires loading the rest of the account page first. (`apps/web/src/app/checkin/page.tsx`, `apps/web/src/app/checkin/NearestVenues.tsx`, `apps/web/src/app/AccountNav.tsx`, `apps/web/src/app/account/page.tsx`)

### Changed

- **Nav logo links to your home neighborhood when signed in.** Previously always linked to `/`; now takes you straight to your neighborhood if you have one set. (`apps/web/src/app/AccountNav.tsx`)
- **Google sign-in now lands on My account, matching email/password login.** Previously redirected to the homepage. (`apps/web/src/app/auth/callback/page.tsx`)
- **"Continue with Google" moved above the email/password form on login and signup.** Social sign-in is now the first option on both pages instead of a secondary link below the form. (`apps/web/src/app/login/page.tsx`, `apps/web/src/app/signup/page.tsx`)
- **Check-in slider is now fully rounded to stand out as an interactive control.** Previously shared the same corner radius as static cards; now pill-shaped like the track/thumb inside it. (`apps/web/src/app/venues/[id]/SlideToCheckIn.tsx`)

## [0.35.1] — 2026-07-09

### Changed

- **Profile page now shows recent check-ins the same way as the account page.** The public profile's activity section was text-only; it now displays recent check-ins as a visual timeline of colored dots, matching the account page's display and making recent activity immediately scannable. The timeline component was extracted into a shared `CheckinTimeline.tsx` so both pages use identical styling and behavior. (`apps/web/src/app/profile/[username]/page.tsx`, `apps/web/src/app/CheckinTimeline.tsx`, `apps/web/src/app/account/page.tsx`)

### Fixed

- **Light/dark theme overrides now apply to the neighborhood map.** The map's venue/POI marker colors and legend text are now aware of the forced theme override from the hamburger menu (light/dark/system) — previously they only followed the OS's `prefers-color-scheme`, so manually toggling to dark mode on a device with a light OS preference would leave the map on the wrong color palette. Added `getResolvedTheme()` and `subscribeToThemeChanges()` helpers to `lib/theme.ts` to let non-CSS consumers (Google Maps marker coloring, map legend text) coordinate with the app's theme preference system. (`apps/web/src/app/neighborhoods/[slug]/MapView.tsx`, `apps/web/src/lib/theme.ts`)
- **Comprehensive theme token migration across 25 admin and business pages.** Every remaining page using hardcoded black/zinc/white color classes is now restyled to use the same Spored design tokens (`text-foreground`, `text-muted`, `bg-card`, `bg-card-alt`, `border-border`, `bg-brand-purple`/`text-on-accent`, etc.) as the core app — this ensures light/dark theming is consistently applied everywhere, not just on the most-frequently-visited surfaces. Affected: login/signup/OAuth callback, business portal and all its forms (announcements/events/social links), neighborhood admin dashboard and every admin surface (overview, boundary drawing, business claims, locations tab, locations review wizard, and all nested forms), the category taxonomy admin page, and the neighborhood map legend. (`apps/web/src/app/login/page.tsx`, `apps/web/src/app/signup/page.tsx`, `apps/web/src/app/auth/callback/page.tsx`, `apps/web/src/app/business/page.tsx`, `apps/web/src/app/business/[venueId]/`, `apps/web/src/app/neighborhood-admin/**`, `apps/web/src/app/admin/category-taxonomy/page.tsx`, `apps/web/src/app/neighborhoods/[slug]/MapView.tsx`)

## [0.35.0] — 2026-07-09

### Added

- **Full marketing homepage.** The landing page stub (hero + a link to `/neighborhoods`) is replaced with a complete marketing homepage: hero with an app-preview mockup, "How Spored works" three-step section, leaderboard teaser with live-style stats, a neighborhood coverage map, a business pitch section with a claim-your-listing card, and a final call-to-action — plus its own sticky nav (How it works / Neighborhoods / For businesses anchors, Sign in, Get the app) and footer. A new `SiteChrome.tsx` swaps out the shared `AccountNav`/`Footer` for this page's own nav/footer on `/` only, leaving every other route unchanged. (`apps/web/src/app/page.tsx`, `apps/web/src/app/SiteChrome.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`)
- **Search box and business/member counts on the "All neighborhoods" browse list.** Each neighborhood card now shows its active business count and member count (🍄/👥), and a search box filters the list by name/city/state as you type. Backed by a new `GET /neighborhoods` field (`business_count`, `member_count`) sourced from a new `get_neighborhood_list_counts` Postgres RPC that aggregates both counts for every neighborhood in one grouped query, rather than the per-neighborhood count calls the single-neighborhood profile page uses. (`apps/web/src/app/neighborhoods/NeighborhoodsSection.tsx`, `apps/api/src/app.ts`, `apps/api/src/neighborhoods/repository.ts`, `apps/api/src/neighborhoods/supabaseRepository.ts`, `packages/types/src/index.ts`, `supabase/migrations/20260709030000_neighborhood_list_counts_fn.sql`)

## [0.34.0] — 2026-07-09

### Added

- **Hamburger menu with a Light/Dark/System theme picker.** The top nav's flat row of account links (home neighborhood, My account, Business portal, Neighborhood admin, log in/out) is replaced with a hamburger button opening a dropdown menu, which now also includes an explicit theme toggle — previously the app only followed the OS's `prefers-color-scheme`, with no way to override it. The choice persists in `localStorage` and applies via a `data-theme` attribute, set by a pre-hydration script so there's no flash of the wrong theme on load. (`apps/web/src/app/AccountNav.tsx`, `apps/web/src/app/ThemeToggle.tsx`, `apps/web/src/lib/theme.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`)
- **Dedicated `/neighborhoods` browse page.** Neighborhood browsing and join/leave (`NeighborhoodsSection`) moves off the landing page onto its own `/neighborhoods` route, so it has room to grow independently of the homepage. (`apps/web/src/app/neighborhoods/page.tsx`, `apps/web/src/app/neighborhoods/NeighborhoodsSection.tsx`)
- **Shared `PlaceListItem` row style for venue/POI lists.** A new component (colored mushroom pin, bold name, muted subtitle line) unifies how venues and POIs are listed across the app — previously each list (neighborhood Venues/POI tabs, account page's nearby/favorite venues, public profile check-ins) had its own slightly different markup. (`apps/web/src/app/PlaceListItem.tsx`)

### Changed

- **Landing page (`/`) simplified to a stub.** The full neighborhoods browse/join list and the API health-check debug widget are gone from `/` (the former moved to `/neighborhoods`, the latter was dev-only scaffolding) — `/` is now just a hero and a "Browse neighborhoods" link, pending a future homepage redesign. (`apps/web/src/app/page.tsx`)
- **Account settings page and profile form now follow the theme system.** These had been left on the pre-rebrand hardcoded black/zinc color classes and didn't respond to the theme picker above; they're restyled onto the same design tokens (`bg-card-alt`, `text-foreground`, `text-muted`, `text-brand-purple`, …) as the rest of the app. (`apps/web/src/app/account/settings/page.tsx`, `apps/web/src/app/account/ProfileForm.tsx`)
- **Every check-in touchpoint now uses the slide-to-check-in gesture.** The POI detail page and the account page's top nearby-venue row previously used a plain tap button (`CheckInButton.tsx`); both now use the same full-width slide gesture as the venue detail page, so there's one consistent "commit to this action" interaction everywhere instead of two. Completes BACKLOG.md Ref 24. (`apps/web/src/app/pois/[id]/page.tsx`, `apps/web/src/app/account/NearestVenues.tsx`, `apps/web/src/app/venues/[id]/SlideToCheckIn.tsx`, `apps/web/src/app/venues/[id]/useCheckIn.ts`)
- **Account page's "Check in nearby" now caps at 5 venues** (was 10), with the slide-to-check-in control only on the first row — the rest list as plain rows, keeping the section a quick nearby-venues glance rather than a long list of sliders. (`apps/web/src/app/account/NearestVenues.tsx`)
- Neighborhood Venues/POI tabs, account page's Favorite venues, and public profile's Recent check-ins now use the shared `PlaceListItem` row style instead of each having their own markup. (`apps/web/src/app/neighborhoods/[slug]/VenuesView.tsx`, `apps/web/src/app/neighborhoods/[slug]/pois/page.tsx`, `apps/web/src/app/account/page.tsx`, `apps/web/src/app/profile/[username]/page.tsx`)

### Removed

- **Per-row check-in link on the neighborhood POI list.** Check-in is still available from a POI's own detail page; the list row itself is now just a link to that page, matching the plain-link style of the Venues tab. (`apps/web/src/app/neighborhoods/[slug]/pois/page.tsx`)
- `CheckInButton.tsx`, now unused — every former caller was migrated to `SlideToCheckIn`. (`apps/web/src/app/venues/[id]/CheckInButton.tsx`)

## [0.33.0] — 2026-07-09

### Added

- **Spored visual rebrand with light/dark theme support.** The app is reskinned end to end under a new "Spored" mycelial-network identity, replacing the previous plain black/white/zinc styling: a warm cream/umber palette in light mode and a deep umber/charcoal palette in dark mode (`prefers-color-scheme`), Baloo 2 (headings) and Nunito (body) fonts in place of Geist, and a new mushroom-mark logo (`MushroomLogo.tsx`) used as the nav brand mark, map/list pins, and the check-in control's thumb icon — its cap color and glow respond to the active theme automatically instead of being frozen to one palette. New shared design tokens (`--card`, `--card-alt`, `--nav`, `--muted`, `--body-text`, `--ink`, `--on-accent`, `--brand-orange/amber/green/purple`) back every restyled surface. (`apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/MushroomLogo.tsx`, `apps/web/src/app/AccountNav.tsx`, `apps/web/src/app/Footer.tsx`, `apps/web/src/app/page.tsx`)
- **Drag-to-check-in gesture on the venue page.** The venue detail page's check-in button is replaced with a full-width slide-to-confirm control (`SlideToCheckIn.tsx`) — drag the mushroom thumb past 70% of the track to check in, mirroring the physical-friction interaction planned for coupon redemption (BACKLOG.md Ref 20/24). The plain tap button (`CheckInButton.tsx`) remains for compact contexts (account page's nearby-venues list, neighborhood POI list) and now shares the same GPS geofence/cooldown logic via an extracted `useCheckIn` hook rather than duplicating it. (`apps/web/src/app/venues/[id]/SlideToCheckIn.tsx`, `apps/web/src/app/venues/[id]/useCheckIn.ts`, `apps/web/src/app/venues/[id]/CheckInButton.tsx`, `apps/web/src/app/venues/[id]/page.tsx`)
- **Level/points progress bar on the account page, and challenge progress bars.** The account page's profile summary now shows a "Level N forager" progress bar toward the next level (50 points per level) alongside favorite/check-in/point stat tiles, and each neighborhood challenge card shows a visual progress bar toward its target instead of a bare "x/y" count — both driven by a new shared `ProgressBar` component. (`apps/web/src/app/ProgressBar.tsx`, `apps/web/src/app/account/ProfileSummaryCard.tsx`, `apps/web/src/app/neighborhoods/[slug]/ChallengesView.tsx`)
- **Collapsible "today's hours" on the venue page.** Opening hours now show a single collapsed "today" line by default, expanding to the full weekly list on tap, instead of always listing every day. (`apps/web/src/app/venues/[id]/VenueHours.tsx`, `apps/web/src/app/venues/[id]/page.tsx`)
- **Decorative mycelial map banner on neighborhood pages.** Neighborhood profile pages gain a stylized two-tone map banner with scattered mushroom pins (not tied to real venue coordinates) as a header visual. (`apps/web/src/app/neighborhoods/[slug]/NeighborhoodMapArt.tsx`, `apps/web/src/app/neighborhoods/[slug]/layout.tsx`)

### Changed

- **Venue page: photo strip promoted above the fold, reviews get avatar chips.** The venue detail page now shows the photo strip immediately under the back link (previously buried inside the enrichment card) and gives each review an avatar-style initial chip colored per reviewer name instead of a plain italic quote list. (`apps/web/src/app/venues/[id]/page.tsx`)
- **Account page: Wishlist/Coupons placeholders now sit side by side, and the check-in section is relabeled "Check in nearby".** (`apps/web/src/app/account/page.tsx`)

### Fixed

- Two dark-mode contrast bugs introduced while restyling: the leaderboard's #1 row and the slide-to-check-in track were using the theme's page background/foreground tokens instead of the always-dark nav tokens, so they rendered as a bright bar in dark mode instead of staying dark chrome. (`apps/web/src/app/neighborhoods/[slug]/page.tsx`, `apps/web/src/app/venues/[id]/SlideToCheckIn.tsx`)

## [0.32.1] — 2026-07-08

### Changed

- **Expanded Google Places enrichment: hours, contact, multiple photos/reviews.** Venue pages previously showed only a rating, price tier, one review snippet, and one photo — even though Google's response already included up to 5 reviews and 10 photos at the same billing tier already being paid for (`reviews`/`photos` already put every call at the top "Enterprise + Atmosphere" SKU). Venue detail pages now also show opening hours, phone/website links, an editorial summary, atmosphere badges (dine-in, takeout, delivery, outdoor seating, reservations, good for kids), a scrollable photo strip, and every cached review instead of just the first. `venue_enrichment_cache` moved from single-value `photo_url`/`review_snippet` columns to `photo_refs`/`reviews` arrays plus new `phone`/`website`/`hours`/`editorial_summary`/`atmosphere` columns; `GET /venues/:id/photo` gained an `?index=` param to select among the cached photos. Completes BACKLOG.md Ref 41. (`apps/api/src/places/client.ts`, `apps/api/src/venues/`, `apps/api/src/app.ts`, `apps/web/src/app/venues/[id]/page.tsx`, `packages/types/src/index.ts`, `supabase/migrations/20260709020000_expand_venue_enrichment.sql`, `docs/url-map.md`)

## [0.32.0] — 2026-07-08

### Fixed

- **Check-ins from a device logged into an account for the first time never counted toward that account.** `anonymous_device_id` only got linked to an account when the device already had prior anonymous check-in/favorite history to merge (`completeLogin`) or a matching anonymous row already existed (`completeSignup`) — a device with no history at all (e.g. a second device, like a phone, logged into an existing account before ever checking in on it) was left unlinked. Every check-in made from it afterward looked up that same still-unclaimed device id, found no account, and silently created a brand-new anonymous `app_user` instead — so the check-in and its points never showed up on the real account, even though the underlying `checkin` row existed and still counted toward venue/neighborhood totals. Login and signup now link the current device to the account even when there's no history to merge. Existing check-ins already stranded under a phantom anonymous user recover automatically the next time that device logs out and back in (the merge path itself already migrates them correctly). (`apps/api/src/auth/auth.ts`, `apps/api/src/auth/repository.ts`, `apps/api/src/auth/supabaseRepository.ts`)

## [0.31.0] — 2026-07-08

### Added

- **Badges on the public profile and account pages.** Badges earned from completing neighborhood challenges or from the founder award previously only showed up inside a neighborhood's challenge list, invisible everywhere else. Both `/profile/:username` and `/account` now show a "Badges" section listing every badge a user has earned across every neighborhood, reusing the existing badge-emoji icon. Backed by a new `GET /me/badges` endpoint and a `badges` field on `GET /users/:username`, both reading from a new cross-neighborhood `getUserBadges` repository method (previously, badge data only existed scoped to one neighborhood's challenge templates). Completes BACKLOG.md Ref 55. (`apps/api/src/gamification/`, `apps/api/src/app.ts`, `apps/web/src/app/profile/[username]/page.tsx`, `apps/web/src/app/account/page.tsx`, `packages/types/src/index.ts`)

## [0.30.0] — 2026-07-08

### Added

- **POI landing pages.** Points of interest (parks, transit stops, landmarks) now have their own detail page at `/pois/:id`, mirroring the venue detail page: name, type, address, description, and the check-in button, plus a link back to the owning neighborhood. The neighborhood profile's Points of interest tab now links each POI's name to its new page instead of showing plain text. Backed by a new public `GET /pois/:id` endpoint (hidden POIs 404, same as a missing one). Completes BACKLOG.md Ref 46. (`apps/api/src/pois/`, `apps/api/src/app.ts`, `apps/web/src/app/pois/[id]/`, `apps/web/src/app/neighborhoods/[slug]/pois/page.tsx`, `packages/types/src/index.ts`, `docs/url-map.md`)
- **Profile stats on neighborhood and POI pages.** The neighborhood profile page now shows stat cards for business count, active POI count, member count, and total check-ins across the neighborhood's venues and POIs — none of that was visible anywhere before. The new POI detail page shows its own check-in count, using the same stat-card style already used on the business owner dashboard. Completes BACKLOG.md Ref 58. (`apps/api/src/checkins/`, `apps/api/src/pois/`, `apps/api/src/venues/`, `apps/api/src/neighborhoodMembers/`, `apps/api/src/app.ts`, `apps/web/src/app/StatCard.tsx`, `apps/web/src/app/neighborhoods/[slug]/layout.tsx`, `apps/web/src/app/pois/[id]/`, `packages/types/src/index.ts`)

## [0.29.0] — 2026-07-09

### Added

- **Bulk Google Places review, and boundary redraw reconciliation.** The Locations tab gained a "Review Places" wizard (`/neighborhood-admin/:slug/locations/review`): an admin-triggered query against the neighborhood's saved boundary lists Google Places candidates not yet a business or POI (deduped against existing rows the same way the sync pipeline already dedupes), and the admin bulk-classifies each as a claimable business, a neighborhood-owned point of interest, or omits it. The same wizard also reconciles a redrawn boundary — every active business/POI whose location no longer falls inside the neighborhood's current boundary is listed as a proposed removal, which the admin must explicitly check before it's hidden (never auto-hidden, never deleted, so check-in/points history survives). The Boundary tab now links into this wizard with a "Review changes now" prompt after a successful save, rather than reconciling automatically. Completes BACKLOG.md Ref 29 and Ref 54. (`apps/api/src/locations/review.ts`, `apps/api/src/app.ts`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/review/`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/page.tsx`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/boundary/page.tsx`, `packages/types/src/index.ts`, `docs/url-map.md`, `BACKLOG.md`)

## [0.28.0] — 2026-07-09

### Added

- **Locations tab: full POI management, merged with venues.** The neighborhood-admin "Venues" tab is now "Locations," listing businesses and neighborhood-owned points of interest (parks, transit stops, landmarks) together, with a "Claimed" pill on businesses that have an approved claim. POIs reach CRUD parity with venues: admins can create, edit, hide/restore, and delete a POI directly from this tab (delete is blocked with a clear message if the POI has check-in or points history, since it would otherwise be silently wiped rather than preserved). All existing venue actions (category reassignment, hide/restore, convert-to-POI) are unchanged. First step of BACKLOG.md Ref 29 — bulk Google Places review/curation remains open. (`supabase/migrations/20260709010000_poi_status.sql`, `apps/api/src/pois/`, `apps/api/src/categoryMapping/`, `apps/api/src/app.ts`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/PoiForm.tsx`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/layout.tsx`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/page.tsx`, `packages/types/src/index.ts`, `docs/url-map.md`)

## [0.27.0] — 2026-07-08

### Added

- **Venue omission and reclassification.** Neighborhood admins can now hide a venue from the Venues tab without deleting it — checkin/favorite/claim history stays intact, and the venue simply drops off the neighborhood's public venue list/map and its own detail page. A hidden venue can be restored as a business again, or converted into a neighborhood-owned point of interest (prefilling the existing "Add POI" form with the venue's name/location/address). `poi` rows gained `google_place_id`/`address` columns so a POI created this way keeps the same Google Places linkage a venue would. (`supabase/migrations/20260708020000_venue_status.sql`, `apps/api/src/categoryMapping/`, `apps/api/src/pois/`, `apps/api/src/venues/supabaseDetailRepository.ts`, `apps/api/src/app.ts`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/venues/page.tsx`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/PoiForm.tsx`, `packages/types/src/index.ts`, `docs/url-map.md`)

## [0.26.0] — 2026-07-08

### Added

- **Admin portal: neighborhood boundary drawing.** Internal staff can now draw a neighborhood's geographic boundary directly on a map instead of hand-authoring GeoJSON — click to place vertices, drag to adjust, then run a dry-run Google Places query against the drawn shape (plotted as markers on the same map) to confirm it captures the right businesses before saving. A new `/neighborhood-admin/new` page creates a neighborhood (name/slug/city/state/country/timezone) together with its boundary in one step, starting in `onboarding` status; a new "Boundary" tab on each neighborhood's admin page re-edits an existing boundary the same way. Turns onboarding a second neighborhood into a data workflow instead of a code change. (`supabase/migrations/20260708010000_neighborhood_boundary_admin_fns.sql`, `apps/api/src/neighborhoods/`, `apps/api/src/places/preview.ts`, `apps/api/src/places/sync.ts`, `apps/api/src/app.ts`, `apps/web/src/app/neighborhood-admin/BoundaryMap.tsx`, `apps/web/src/app/neighborhood-admin/new/`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/boundary/`, `packages/types/src/index.ts`, `docs/url-map.md`)

### Fixed

- **Check-in cooldown message didn't say which cooldown was active.** "Already checked in here recently" showed even when the block was actually the 2-minute cross-venue cooldown from checking in somewhere *else* seconds ago — not this venue. The check-in API now reports which cooldown fired (`target` vs. `global`), and the check-in button shows the correct message for each. (`apps/api/src/checkins/checkin.ts`, `apps/api/src/app.ts`, `apps/web/src/app/venues/[id]/CheckInButton.tsx`)

## [0.25.1] — 2026-07-08

### Added

- **Badge icons.** Badges earned from challenges now render an actual glyph (currently an emoji mapped from the existing `badge.icon` code, e.g. ☕ for "coffee", 🧭 for "compass", ⭐ for "star", with a 🏅 fallback for unrecognized codes) instead of just showing up as a name in the challenge list. (`apps/web/src/app/BadgeIcon.tsx`, `apps/web/src/app/neighborhoods/[slug]/ChallengesView.tsx`)

### Changed

- **Neighborhood page split into subnav tabs.** The neighborhood profile page's Venues, Challenges, Upcoming events, Points of interest, and Leaderboard sections — previously one long vertical scroll — are now separate tabs (Leaderboard is the default landing tab), each its own route so it's directly linkable and only fetches the data it needs. (`apps/web/src/app/neighborhoods/[slug]/layout.tsx`, `apps/web/src/app/neighborhoods/[slug]/NeighborhoodTabs.tsx`, `apps/web/src/app/neighborhoods/[slug]/page.tsx`, `apps/web/src/app/neighborhoods/[slug]/challenges/page.tsx`, `apps/web/src/app/neighborhoods/[slug]/events/page.tsx`, `apps/web/src/app/neighborhoods/[slug]/pois/page.tsx`, `apps/web/src/app/neighborhoods/[slug]/venues/page.tsx`, `docs/url-map.md`)
- **Tighter page padding on mobile.** Every top-level page's outer container used a fixed `p-16` (64px) padding regardless of viewport, eating a large share of the screen width on phones. Padding now scales down to `p-4` (16px) below the `sm` breakpoint and stays at `p-16` above it, across all 14 top-level pages. (`apps/web/src/app/**/page.tsx`, `apps/web/src/app/**/layout.tsx`, `apps/web/src/app/business/[venueId]/BusinessVenueDashboard.tsx`)

## [0.25.0] — 2026-07-08

### Fixed

- **Check-ins/favorites made right after signing in could silently lose their points.** `mergeAnonymousHistory` (run when a device with prior anonymous check-in history logs into an account) reassigned check-ins onto the account but then deleted the anonymous row outright, which cascade-deleted that row's `point_event`/`favorite`/`user_badge`/`user_challenge_completion` rows before they could be moved over — wiping out already-earned points and badges even though the check-ins themselves survived. The merge now runs as a single DB transaction (`merge_anonymous_user_history`) that migrates those rows first. A new backfill recovers points lost to this bug for existing accounts. (`supabase/migrations/20260708000000_fix_merge_anonymous_history_data_loss.sql`, `supabase/migrations/20260708000001_backfill_missing_checkin_favorite_points.sql`, `apps/api/src/auth/supabaseRepository.ts`)
- **Points could silently fail to award on a fresh check-in or favorite.** The points/challenge award ran as a fire-and-forget promise *after* the HTTP response was already sent; since this API runs as a Netlify/Lambda function, the runtime can freeze the execution environment as soon as the response completes, so that pending work wasn't guaranteed to finish. Points are now awarded before the response is sent (still without failing the check-in/favorite itself if the award errors). (`apps/api/src/app.ts`)

## [0.24.0] — 2026-07-07

### Added

- **Founding member badge.** Every account now automatically earns a "Founder" badge at signup, recognizing early participation while Blockwise is still pre-launch — the same recognition a completed challenge already earns (v0.22.0), just for being here first. All pre-existing accounts were backfilled with the badge too. This auto-award is meant to stop once v1.0.0 ships (tracked in `BACKLOG.md` Ref 52). (`supabase/migrations/20260707060000_founder_badge.sql`, `supabase/migrations/20260707070000_founder_badge_backfill.sql`, `apps/api/src/gamification/founderBadge.ts`, `apps/api/src/gamification/repository.ts`, `apps/api/src/app.ts`)
- **Account settings page.** Profile editing, account details, and neighborhood-membership management (including the home-neighborhood picker) moved off the main account page onto a new `/account/settings` page, linked from a new "Settings" link on `/account` — keeping the main account page focused on activity (profile summary, check-in, favorites, check-ins) instead of competing with form fields. (`apps/web/src/app/account/settings/page.tsx`, `apps/web/src/app/account/page.tsx`, `docs/url-map.md`)
- **Home neighborhood shown in the main nav.** Signed-in users now see a link to their home neighborhood in the top nav bar, alongside the existing account/business/admin links. (`apps/web/src/app/AccountNav.tsx`)

### Fixed

- **Backfilled points for check-ins/favorites made before points existed.** Points/badges (v0.22.0) only accrued from check-ins and favorites made after it shipped; existing history now earns the same points it would have live (10pts/check-in, 5pts/first-time favorite), so early users' leaderboard totals reflect their actual activity. (`supabase/migrations/20260707080000_backfill_checkin_favorite_points.sql`)

## [0.23.0] — 2026-07-07

### Added

- **Account page profile summary and check-in-first layout.** The account page now opens with a profile summary card (avatar, favorite count, check-in count, and an all-time points total via a new `GET /me/points`), with the favorite/check-in counts linking down to their full lists on the same page. Below it, a new "Check in" section lists the nearest venues in the user's home neighborhood (sorted by device location when available, falling back to alphabetical), each with its own one-tap check-in button, so checking in doesn't require navigating to a specific venue page first. (`apps/web/src/app/account/ProfileSummaryCard.tsx`, `apps/web/src/app/account/NearestVenues.tsx`, `apps/web/src/app/account/page.tsx`, `apps/api/src/gamification/`, `apps/api/src/app.ts`, `packages/types/src/index.ts`)
- **Sort neighborhood venues by proximity.** The venues list on a neighborhood page now has an A-Z / Nearest toggle alongside the existing List/Map toggle — "Nearest" sorts by distance from the device's current location (prompting for location access on first use) instead of always defaulting to alphabetical. (`apps/web/src/app/neighborhoods/[slug]/VenuesView.tsx`, `apps/web/src/lib/geo.ts`, `apps/web/src/lib/geolocation.ts`)

## [0.22.0] — 2026-07-07

### Added

- **Challenges, points, and a neighborhood leaderboard.** The first slice of the gamification loop the README's tagline has always promised ("join challenges, and earn badges"): a check-in now earns 10 points and favoriting/following a venue earns 5 (once per venue — unfavoriting and refavoriting doesn't farm it), tallied into a new neighborhood-scoped leaderboard (`GET /neighborhoods/:slug/leaderboard`) that only surfaces public-visibility profiles. Two seeded template challenges kick off Phinneywood's first month: "Coffee Crawl" (check in to 5 different coffee shops during July, 50pt bonus + a Coffee Crawler badge) and "Explore Woodland Park" (check in to a POI, 20pt bonus + a Neighborhood Explorer badge) — completing one is detected automatically after a qualifying check-in and is a one-time award per user. Challenges are template-driven rows in a new `challenge` table (category- or POI-targeted, with a start/end window and optional badge), so future challenges are a data change, not a code change; live per-user progress is shown via `GET /neighborhoods/:slug/challenges`. (`supabase/migrations/20260707040000_points_badges_challenges.sql`, `supabase/migrations/20260707050000_seed_challenges.sql`, `apps/api/src/gamification/`, `apps/api/src/app.ts`, `apps/web/src/app/neighborhoods/[slug]/ChallengesView.tsx`, `apps/web/src/app/neighborhoods/[slug]/page.tsx`, `packages/types/src/index.ts`)
- **Check-ins can now target a neighborhood POI, not just a venue.** POI check-ins (`POST /pois/:id/checkins`) reuse the same 100m GPS geofence and cooldown rules as venue check-ins, and are what the "Explore Woodland Park" challenge above checks into. `poi` gains `lat`/`lng` columns so a POI has a real location to check GPS proximity against. (`supabase/migrations/20260707030000_checkin_poi_target.sql`, `apps/api/src/checkins/`, `apps/web/src/app/venues/[id]/CheckInButton.tsx`, `apps/web/src/app/neighborhoods/[slug]/page.tsx`)
- **Global cross-venue check-in cooldown.** Alongside the existing 4-hour per-venue/POI cooldown, a new 2-minute cooldown against the user's *most recent check-in anywhere* stops rapid-tapping through several nearby venues to instantly farm a multi-venue challenge like "5 coffee shops." (`apps/api/src/checkins/checkin.ts`)

### Changed

- **POI simplified to always be neighborhood-owned.** POI previously supported an unused venue-owned option (added for a future "POI within a venue" use case that never got a writer — only the sync pipeline was ever slated to populate it, and never did). Dropped `poi.venue_id` and the `poi_owner_check` constraint; `poi.neighborhood_id` is now required. The venue detail page's dead "Points of interest" section (always empty, since nothing ever wrote to it) is removed along with it. (`supabase/migrations/20260707020000_poi_neighborhood_only.sql`, `apps/api/src/pois/`, `apps/api/src/venues/`, `apps/web/src/app/venues/[id]/page.tsx`, `packages/types/src/index.ts`)

## [0.21.0] — 2026-07-07

### Added

- **Public user profiles.** Profiles are now browsable at `/profile/:username` for any account that has both chosen a username and set its visibility to public (v0.20.0's `visibility` column, still private by default) — showing avatar, display name, join date, joined neighborhoods, and up to 10 recent check-ins. A private or username-less profile 404s the same way a nonexistent one would, so its existence isn't leaked to outside callers. `app_user` gains a `username` column (lowercase letters/numbers/`_`/`-`, 3-30 characters, unique), self-editable alongside the existing profile fields via `PATCH /me/profile`, which now also returns `409` if the chosen username is already taken. New public endpoint: `GET /users/:username`. (`supabase/migrations/20260707010000_public_user_profiles.sql`, `apps/api/src/auth/`, `apps/api/src/app.ts`, `apps/web/src/app/profile/`, `apps/web/src/app/account/ProfileForm.tsx`, `packages/types/src/index.ts`)
- **Google profile picture on signup.** A fresh signup via Google OAuth now seeds `avatar_url` from the account's Google profile picture instead of leaving it blank until manually filled in — one less step to a profile that looks like *someone*. Only seeded once, at signup; a later manual edit (or manual clear) via `PATCH /me/profile` is never overwritten. Avatars now render as an actual image (falling back to an initial-letter monogram when unset) on the account page and the new public profile page, via a shared `Avatar` component, rather than only existing as a raw URL in a form field. (`apps/api/src/auth/verifyToken.ts`, `apps/api/src/auth/auth.ts`, `apps/web/src/app/Avatar.tsx`, `apps/web/src/app/account/ProfileForm.tsx`, `apps/web/src/app/profile/`)

## [0.20.0] — 2026-07-07

### Added

- **User profiles with public or private visibility.** `app_user` gains `display_name`, `avatar_url`, and `visibility` (`public`/`private`, private by default — a signed-in identity doesn't by itself imply the user wants their presence visible to anyone else). Self-editable from the account page via a new `PATCH /me/profile` endpoint; blank display names clear the field rather than storing an empty string, and fields omitted from a request are left untouched. This is the foundation the still-open Connect-with-other-users, activity-feed, and business-visitor-history backlog items depend on. (`supabase/migrations/20260707000000_user_profile_visibility.sql`, `apps/api/src/auth/`, `apps/api/src/app.ts`, `apps/web/src/app/account/`, `packages/types/src/index.ts`)
- **Homepage blurb.** The landing page jumped straight into the neighborhood list with no framing; a short hero section ("Discover local. Check in. Connect." plus a one-sentence description) now sits above the grid. (`apps/web/src/app/page.tsx`)
- **Version number in the footer.** A new footer, visible on every page, shows the running app version (read from `package.json`) so support staff and users can tell at a glance which build they're on. (`apps/web/src/app/Footer.tsx`, `apps/web/src/app/layout.tsx`)

### Changed

- **`BACKLOG.md` reorganized by domain instead of by item type.** The four type-based tables (Features/Improvements/Known Issues/Limitations) are now four domain-based tables (Neighborhood, Business & Venue, User, Infrastructure & Design), each covering every item type in one place — easier to see everything planned for a given area at a glance. All existing Ref numbers and Depends relationships are unchanged. (`BACKLOG.md`)

## [0.19.0] — 2026-07-07

### Added

- **Neighborhood admin: business claims and venue categories as tabs.** Business-claim review and venue-category reassignment moved from two separate, ungated-by-neighborhood pages (`/admin/claims`, `/admin/venues` — both required only "admin of *some* neighborhood," with no way to scope to one) into `Business claims` and `Venue categories` tabs alongside the existing per-neighborhood `Overview` tab. New neighborhood-scoped endpoints (`GET /neighborhood-admin/neighborhoods/:id/claims`, `POST .../claims/:claimId/approve|reject`, `GET .../venues`, `PATCH .../venues/:venueId/category`) replace the old global ones, closing a real correctness gap: an admin previously saw and could mutate every neighborhood's claims/venues at once, not just the one(s) they administer. The claims tab now also shows the venue's name/address instead of a bare id. (`apps/api/src/claims/`, `apps/api/src/categoryMapping/`, `apps/api/src/app.ts`, `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/`, `packages/types/src/index.ts`)

### Changed

- **Neighborhood admin URLs now use the neighborhood's slug instead of its UUID** (`/neighborhood-admin/[neighborhoodId]` → `/neighborhood-admin/[neighborhoodSlug]`), matching the public `/neighborhoods/[slug]` convention — the same identifier everywhere for a given neighborhood. A new `layout.tsx` resolves slug → id once and shares it via context across all three tabs, and owns the shared signed-out/forbidden state plus the tab nav. (`apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/`)
- **Documentation reorganized.** The original build plan moved from the root `README.md` to `docs/project-plan.md` (section numbers unchanged, since code comments and `BACKLOG.md` cite them); a new, concise root `README.md` covers project overview, repo structure, and local setup instead. `docs/url-map.md` is now a maintained route tree (web + API) rather than a point-in-time snapshot, with an explicit instruction — also added to `CLAUDE.md`/`CONTRIBUTING.md` — to update it whenever a route changes. `apps/api/GOOGLE_PLACES_SETUP.md` moved to `docs/google-places-setup.md` for naming consistency with the rest of `docs/`. (`README.md`, `docs/`, `CLAUDE.md`, `CONTRIBUTING.md`, `BACKLOG.md`)

### Fixed

- **Homepage "Join" button didn't persist across a refresh.** The neighborhood list fetch (`GET /neighborhoods`) was missing its `Authorization` header, so the server couldn't identify the signed-in user and always reported `joined: false` on reload — the join itself worked, the page just didn't reflect it. (`apps/web/src/app/NeighborhoodsSection.tsx`)

### Removed

- **Global `/admin/claims` and `/admin/venues` pages.** Replaced by the neighborhood-scoped tabs above; deleted outright with no redirects (no production users depend on the old URLs). (`apps/web/src/app/admin/claims/`, `apps/web/src/app/admin/venues/`)

## [0.18.0] — 2026-07-07

### Added

- **Instagram links and social media integration.** Business profile pages and neighborhood profile pages were read-only — there was no way to link out to a business or neighborhood's own social media presence. Claimed business owners and neighborhood admins can now add outbound links (Instagram, Twitter/X, TikTok, Facebook, website) from their respective dashboards, stored as a generic `social_links` JSON map (`business_claim.social_links`, `neighborhood.social_links`) rather than one column per platform, so a new platform is a type change, not a migration. Links show up as a row of outbound links on the public venue detail page and neighborhood profile page. New endpoints: `PATCH /business/venues/:id/social-links`, `PATCH /neighborhood-admin/neighborhoods/:id/social-links`; `GET /venues/:id` and `GET /neighborhoods/:slug` now include `social_links`. Links-only for now — feed embedding was considered but dropped due to API/display-terms complexity. (`supabase/migrations/20260706120000_social_links.sql`, `apps/api/src/claims/`, `apps/api/src/neighborhoods/`, `apps/api/src/venues/`, `apps/api/src/app.ts`, `apps/web/src/app/business/[venueId]/SocialLinksForm.tsx`, `apps/web/src/app/neighborhood-admin/[neighborhoodId]/SocialLinksForm.tsx`, `apps/web/src/app/venues/[id]/page.tsx`, `apps/web/src/app/neighborhoods/[slug]/page.tsx`, `packages/types/src/index.ts`)

## [0.17.0] — 2026-07-06

### Added

- **Category taxonomy management.** The category-mapping admin tool (v0.11.0) could only reassign which existing leaf category a venue belongs to — there was no way to add, rename, or retire a category itself without a direct DB edit. A new admin page (`/admin/category-taxonomy`) lets admins create top-level groups or leaf categories (optionally tagging a leaf with the Google Places `types[]` the sync pipeline matches against), rename any category, and archive one — archiving is blocked if the category is still assigned to any venue, or (for a group) still has active leaf children, so nothing gets silently orphaned. Archived categories no longer appear as assignable options in the existing venue category-reassignment tool. Adds a `category.status` column (`active`/`archived`, mirroring the status-enum pattern already used by `neighborhood`/`business_claim`) rather than deleting rows outright. New endpoints: `GET`/`POST /admin/category-taxonomy`, `PATCH /admin/category-taxonomy/:id`, `POST /admin/category-taxonomy/:id/archive`, all gated by the existing `requireAdmin` middleware. 13 new unit tests. (`supabase/migrations/20260706110000_category_taxonomy_management.sql`, `apps/api/src/categoryAdmin/`, `apps/api/src/categoryMapping/supabaseRepository.ts`, `apps/api/src/app.ts`, `apps/web/src/app/admin/category-taxonomy/`, `packages/types/src/index.ts`)

## [0.16.2] — 2026-07-07

### Changed

- **Venues now browse from the neighborhood page instead of a standalone `/venues` list.** The List/Map toggle (shipped v0.7.0) moved from the top-level `/venues` page onto each neighborhood's profile page (`/neighborhoods/[slug]`), scoped to that neighborhood's own venues via a new `GET /neighborhoods/:id/venues` endpoint — the venue table has always had a `neighborhood_id` column, but nothing queried by it until now. The venue detail page's back link now points to the venue's own neighborhood (`neighborhood_slug`/`neighborhood_name` added to `VenueDetail`) instead of the removed `/venues` list. Post-login/signup redirects for consumer accounts now land on the landing page instead of the removed page. (`apps/api/src/app.ts`, `apps/api/src/venues/`, `apps/web/src/app/neighborhoods/[slug]/`, `apps/web/src/app/venues/[id]/page.tsx`, `apps/web/src/app/login/page.tsx`, `apps/web/src/app/signup/page.tsx`, `apps/web/src/app/auth/callback/page.tsx`, `packages/types/src/index.ts`)
- **`apps/api`'s TypeScript config switched to `Node16` module/moduleResolution** (from `CommonJS`/`Node`), matching the package's actual ESM-style import resolution and clearing an editor type-checking error. (`apps/api/tsconfig.json`)

### Fixed

- **"Blockwise" home link went to the venues list instead of the landing page.** The nav bar's wordmark linked to `/venues`, so there was no way to get back to the landing page (neighborhood browsing, sign-in status) short of typing the URL. Now links to `/`. (`apps/web/src/app/AccountNav.tsx`)
- **Date inputs and dropdowns were unreadable in dark mode.** Native form controls (`<select>`, `type="date"`/`"datetime-local"` inputs) render their own calendar icon, dropdown arrow, and popup list outside of Tailwind's styling — without a `color-scheme` declaration, browsers draw that chrome for light mode regardless of the page's own dark theme, making it blend into or vanish against the dark background. Added `color-scheme: light`/`dark` alongside the existing light/dark CSS variables so these controls render correctly in both themes. (`apps/web/src/app/globals.css`)

## [0.16.1] — 2026-07-06

### Fixed

- **Landing page showing "No neighborhoods yet" in production.** `GET /neighborhoods` (added in v0.16.0) filtered to `status = 'active'`, but the seeded Phinneywood neighborhood is still `'onboarding'` — a status nothing else in the app has ever gated on, despite the neighborhood being fully live (venues, check-ins, business claims, its own public profile page). The filter silently hid the only neighborhood that exists. Now lists every neighborhood regardless of status. (`apps/api/src/neighborhoods/repository.ts`, `apps/api/src/neighborhoods/supabaseRepository.ts`, `apps/api/src/app.ts`)

## [0.16.0] — 2026-07-06

### Added

- **Neighborhoods on landing page and user profile.** Neighborhoods are now discoverable and joinable from the landing page, and visible on the "My account" page. A new `neighborhood_member` table (`user_id`, `neighborhood_id`, `is_primary`) records a signed-in user's membership, with a partial unique index enforcing at most one "home" neighborhood per user. The landing page now shows every active neighborhood with a join/leave button (and a "Your neighborhoods" section when signed in) via a new public `GET /neighborhoods` endpoint (optionally authenticated to flag which are already joined). The neighborhood profile page (`/neighborhoods/[slug]`) gained a matching join/leave button. The account page gained a "Neighborhoods" section listing joined neighborhoods with a "Set as home" action. New endpoints: `GET /neighborhoods`, `GET /me/neighborhoods`, `POST`/`DELETE /neighborhoods/:id/join`, `POST /neighborhoods/:id/home`, all backed by a new `neighborhoodMembers/` domain mirroring the `favorites/` pattern, but sign-in required rather than device-scoped. 6 new unit tests. (`supabase/migrations/20260706100000_neighborhood_membership.sql`, `apps/api/src/neighborhoodMembers/`, `apps/api/src/neighborhoods/repository.ts`, `apps/api/src/neighborhoods/supabaseRepository.ts`, `apps/api/src/app.ts`, `apps/web/src/app/NeighborhoodsSection.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/account/page.tsx`, `apps/web/src/app/neighborhoods/[slug]/page.tsx`, `apps/web/src/app/neighborhoods/[slug]/JoinNeighborhoodButton.tsx`, `packages/types/src/index.ts`)

## [0.15.0] — 2026-07-07

### Added

- **Neighborhood profile pages.** Each neighborhood now gets a public profile (`/neighborhoods/[slug]`) mirroring the venue/business profile's shape — a description, upcoming events, and neighborhood-owned points of interest (parks, transit, landmarks not tied to any single business). Authored from a new self-serve `/neighborhood-admin` portal, gated by a new `requireNeighborhoodAdmin` middleware that (unlike the existing global `requireAdmin`) proves the signed-in account administers that *specific* neighborhood. Reuses the existing venue-scoped `poi`/`event` tables rather than duplicating them — `venue_id` is now nullable on both, with a new `neighborhood_id` column and a check constraint enforcing exactly one owner per row. New endpoints: public `GET /neighborhoods/:slug`, `GET /neighborhoods/:id/events`; authenticated `GET /neighborhood-admin/neighborhoods`, `GET .../:id/dashboard`, `PATCH .../:id`, `POST .../:id/events`, `POST .../:id/pois`. 13 new unit tests. (`supabase/migrations/20260706090000_neighborhood_profile.sql`, `apps/api/src/neighborhoods/`, `apps/api/src/pois/`, `apps/api/src/admin/requireNeighborhoodAdmin.ts`, `apps/api/src/admin/repository.ts`, `apps/api/src/admin/supabaseRepository.ts`, `apps/api/src/events/`, `apps/api/src/venues/supabaseDetailRepository.ts`, `apps/api/src/app.ts`, `apps/web/src/app/neighborhoods/`, `apps/web/src/app/neighborhood-admin/`, `apps/web/src/app/AccountNav.tsx`, `packages/types/src/index.ts`)

## [0.14.1] — 2026-07-06

### Fixed

- **Business claims not linking to the submitter's account in the common signup order.** `POST /venues/:id/claims` only set `business_claim.claimed_by_user_id` if the submitter was *already* a business account at the moment they submitted the claim — but the signup form defaults to a consumer account, so the realistic flow (sign up as consumer → submit a claim → promote to business via `/business`) left the claim permanently unlinked, even after an admin approved it, since the field was never set retroactively. Now any signed-in account (consumer or business) gets linked at submission time, matching the field's original intent per its migration comment ("auto-link to its own submitter once authenticated") rather than requiring business status up front. (`apps/api/src/app.ts`, `apps/web/src/app/venues/[id]/ClaimBusinessForm.tsx`)

## [0.14.0] — 2026-07-06

### Added

- **Business owner venue dashboard.** A claimed business owner can now open a per-venue dashboard (`/business/[venueId]`, linked from each venue on the existing `/business` portal) showing follower count (a count of `favorite` rows — there's no separate "follow" table) and check-in count, alongside two new content types they can author: `Announcement` (a one-off update) and `Event` (a scheduled, time-boxed listing), both scoped to the venue and shown publicly on that venue's detail page. Ownership of the specific venue being managed is enforced server-side by a new `requireVenueOwner` middleware — stronger than the existing `requireBusinessAccount` gate, which only proved "a business account" rather than "owns this venue." No moderation queue or entitlement/credit gating yet — announcements publish immediately and creation is unlimited — both are separate, later backlog items ("Business announcements", "Monetization: credits & entitlements"). New `GET /business/venues/:id/dashboard`, `POST /business/venues/:id/announcements`, `POST /business/venues/:id/events`, and public `GET /venues/:id/announcements`/`events` endpoints. 6 new unit tests. (`supabase/migrations/20260706080000_business_owner_dashboard.sql`, `apps/api/src/announcements/`, `apps/api/src/events/`, `apps/api/src/claims/requireVenueOwner.ts`, `apps/api/src/claims/repository.ts`, `apps/api/src/claims/supabaseRepository.ts`, `apps/api/src/favorites/repository.ts`, `apps/api/src/favorites/supabaseRepository.ts`, `apps/api/src/checkins/repository.ts`, `apps/api/src/checkins/supabaseRepository.ts`, `apps/api/src/app.ts`, `apps/web/src/app/business/`, `apps/web/src/app/venues/[id]/page.tsx`, `packages/types/src/index.ts`)

## [0.13.0] — 2026-07-06

### Added

- **My account page.** A new `/account` page giving signed-in users a single place to see their identity, favorites, and check-in history, instead of each being scattered across its own flow. Two new endpoints back it: `GET /me/favorites` and `GET /me/checkins`, both venue-joined listings (name/address alongside the raw `favorite`/`checkin` rows) gated by `requireAuthUser`. Wishlist and coupons sections show a "Coming soon" placeholder — neither has a backend yet (separate backlog items) — rather than being omitted outright, so the page's shape is already in place for when they land. A "My account" link was added to the top nav for any signed-in user. (`apps/api/src/favorites/`, `apps/api/src/checkins/`, `apps/api/src/app.ts`, `apps/web/src/app/account/page.tsx`, `apps/web/src/app/AccountNav.tsx`, `packages/types/src/index.ts`)

## [0.12.0] — 2026-07-06

### Added

- **Neighborhood admin roles.** Replaces the shared `ADMIN_API_TOKEN` secret with per-account admin roles: a new `neighborhood_admin` table (`user_id`, `neighborhood_id`) is checked by `requireAdmin`, which now requires a real signed-in session (the same Bearer-token auth as every other `/auth/*`-gated route) instead of an `X-Admin-Token` header. The role is additive to `account_type` — an account can be a consumer, a claimed business owner, and a neighborhood admin all at once. Granting is done via a new CLI script (`npm run grant:admin -- <email> <neighborhood-slug>`, mirroring `sync:places`) rather than a self-service invite UI, matching this project's current solo-operator scale — a self-serve invite flow remains a smaller follow-up on the backlog. `AppUser` gained an `is_neighborhood_admin` flag, surfaced in the top nav (`AccountNav`) as "Admin: claims" / "Admin: venues" links alongside the existing "Business portal" link. The `/admin/claims` and `/admin/venues` pages now sign requests with the browser's own session token instead of a pasted admin token. (`supabase/migrations/20260706070000_neighborhood_admin.sql`, `apps/api/src/admin/`, `apps/api/src/app.ts`, `apps/api/src/auth/auth.ts`, `apps/api/src/scripts/grantNeighborhoodAdmin.ts`, `apps/web/src/app/admin/`, `apps/web/src/app/AccountNav.tsx`, `packages/types/src/index.ts`)

## [0.11.0] — 2026-07-06

### Added

- **Category mapping admin tool.** A new `/admin/venues` page (same shared `ADMIN_API_TOKEN` gate as `/admin/claims`) lets an admin search venues by name or address and reassign a venue's category from a dropdown of the 39 leaf categories (grouped by their parent, e.g. "Food & Drink / Coffee Shop") — the manual override README §2 calls for when the sync's category-normalization step (README §1.4 step 3) maps a venue wrong. New `GET/PATCH /admin/venues*` and `GET /admin/categories` endpoints, backed by a `categoryMapping/` domain mirroring the `claims/` pattern; only leaf categories (those with a parent) are valid reassignment targets, since the 6 top-level group rows are organizational only. No schema changes — reuses the existing `venue`/`category` tables. 6 new unit tests. (`apps/api/src/categoryMapping/`, `apps/api/src/app.ts`, `apps/web/src/app/admin/venues/page.tsx`, `packages/types/src/index.ts`)

## [0.10.0] — 2026-07-06

### Added

- **Google social sign-in (OAuth).** A "Continue with Google" button on `/login` and `/signup`, alongside the existing email/password forms. Uses Supabase's `signInWithOAuth`, redirecting through a new `/auth/callback` page that completes the session — tries `/auth/complete-login` first (so a device's anonymous check-in history still merges correctly per README §14.2), falling back to `/auth/complete-signup` for a first-time Google user. No API changes: `verifyToken.ts` already read the auth provider generically off `app_metadata`. The signup form's consumer/business account-type choice is preserved across the redirect via `localStorage`, since Google's round trip would otherwise lose it. (`apps/web/src/lib/auth.ts`, `apps/web/src/app/auth/callback/page.tsx`, `apps/web/src/app/login/page.tsx`, `apps/web/src/app/signup/page.tsx`)
- **Promote a consumer account to a business account.** The business portal (`/business`) now offers a "Become a business owner" button for a signed-in consumer account, instead of only pointing at a fresh signup. New `POST /auth/promote-to-business` endpoint flips `account_type` on the existing `app_user` row in place — same identity, same check-in history, no new account. Idempotent if the account is already a business account. 2 new unit tests. (`apps/api/src/auth/auth.ts`, `apps/api/src/auth/repository.ts`, `apps/api/src/auth/supabaseRepository.ts`, `apps/api/src/app.ts`, `apps/web/src/lib/auth.ts`, `apps/web/src/app/business/page.tsx`)

### Changed

- **Synced `package.json` versions across the monorepo.** `apps/api` and `packages/types` were still at `0.0.0` and `apps/web` at `0.1.0` while the root tracked the real release version — all four now move together. `CLAUDE.md` updated to document that all four must be bumped together going forward. (`package.json`, `apps/api/package.json`, `apps/web/package.json`, `packages/types/package.json`, `CLAUDE.md`)

## [0.9.0] — 2026-07-06

### Added

- **Favorite venues.** A personal "I like this place" bookmark on the venue detail page, separate from check-ins or business claiming. Device-scoped like check-ins (README §14.2) — attaches to the existing anonymous `app_user` row and converts for free on signup, no migration step. New `favorite` table (unique per user/venue, RLS-enabled service-role-only like every other table), `GET/POST/DELETE /venues/:id/favorites` endpoints, and a toggle button on the venue detail page that loads current status on mount. 7 new unit tests. (`supabase/migrations/20260706060000_favorite_venues.sql`, `apps/api/src/favorites/`, `apps/api/src/app.ts`, `apps/web/src/app/venues/[id]/FavoriteButton.tsx`, `apps/web/src/app/venues/[id]/page.tsx`, `packages/types/src/index.ts`)

## [0.8.0] — 2026-07-06

### Added

- **Real user authentication.** Supabase Auth (email/password) signup and login, completing the anonymous-first `app_user` row from v0.6.0 rather than migrating to a new one (README §14.2) — signup flips `is_anonymous` to false and attaches auth credentials to the same row, so prior check-in history is never lost. Logging in from a device with its own separate anonymous history merges that history onto the account being logged into, rather than orphaning it (README §14.2's documented edge case). Also adds a business-account variant (`account_type`): a business owner's claim submission auto-links to their account when signed in (`business_claim.claimed_by_user_id`), and a new gated `/business` portal page lists the venues that account has an approved claim on — the first concrete use of the `requireBusinessAccount` gate that later authoring-tool features (announcements, etc.) will build on. New `apps/api/src/auth/` domain (signup/login/merge logic, Supabase Auth token verification, `requireAuthUser`/`requireBusinessAccount`/`attachOptionalAuthUser` middleware) with 9 new unit tests; new `/signup`, `/login`, `/business` pages and a nav bar in `apps/web`. (`supabase/migrations/20260706050000_user_authentication.sql`, `apps/api/src/auth/`, `apps/api/src/app.ts`, `apps/api/src/claims/`, `apps/web/src/app/signup/`, `apps/web/src/app/login/`, `apps/web/src/app/business/`, `apps/web/src/app/AccountNav.tsx`, `apps/web/src/lib/auth.ts`, `apps/web/src/lib/supabaseClient.ts`, `packages/types/src/index.ts`)
- **Supabase migration workflow docs.** New `supabase/README.md` covering the day-to-day CLI commands (`login`/`link`, local `start`/`db reset`, `migration new`, `db push`) that CONTRIBUTING.md's conventions section didn't itself spell out. (`supabase/README.md`)

### Security

- **Removed a prompt-injection attempt embedded in the repo.** `apps/web/AGENTS.md` (auto-loaded by `apps/web/CLAUDE.md`) instructed any agent reading it to consult fabricated documentation at a Next.js path that doesn't exist, framed as "this is NOT the Next.js you know" — a planted instruction rather than genuine project guidance. Both files removed; neither carried any other content worth preserving. (`apps/web/AGENTS.md`, `apps/web/CLAUDE.md`)

## [0.7.0] — 2026-07-06

### Added

- **Venues map view.** `/venues` now has a List/Map toggle; the map renders every venue as a marker on the Google Maps JavaScript API, colored by its top-level category group (Food & Drink, Retail, Health & Wellness, Services, Arts/Culture/Recreation, Lodging) with an always-visible legend, clustered via `@googlemaps/markerclusterer` so dense blocks collapse into a single pin until zoomed in, and fit to the actual bounds of the synced venues rather than a fixed center/zoom. Clicking a marker opens an info window (name, category, address, a link to the venue's detail page) built from DOM APIs rather than an HTML string, since venue name/address ultimately come from Google Places sync and, later, business self-submission — neither should be trusted as pre-sanitized HTML. Marker/legend colors were run through the project's dataviz-palette validator for colorblind-safe separation in both light and dark mode. Falls back to a clear message instead of a broken map when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` isn't configured. `VenueListItem` (and the `GET /venues` list endpoint) now also carries `lat`/`lng` and a `category_group` field (the category's parent row, distinct from its specific `category_name`) to support marker placement and color-coding. Verified end-to-end in a browser against live Phinneywood data (229 venues) with a real Maps API key: toggle, clustering, category colors, and the marker click → info window flow. (`apps/web/src/app/venues/MapView.tsx`, `apps/web/src/app/venues/VenuesView.tsx`, `apps/web/src/lib/categoryColors.ts`, `apps/web/src/app/venues/page.tsx`, `apps/api/src/venues/supabaseDetailRepository.ts`, `packages/types/src/index.ts`, `apps/web/.env.example`)

## [0.6.0] — 2026-07-06

### Added

- **Business claiming + GPS check-in.** Consumers can check in at a venue from its detail page: the browser's Geolocation API is checked against `Venue.lat/lng` with a 100m geofence (README §4 Phase 1), and repeat check-ins at the same venue are blocked for 4 hours to prevent streak gaming. Check-ins attach to a new anonymous-first `app_user` row (README §14.2) — every device gets one from its first check-in, identified by a device id generated client-side and persisted in `localStorage`, with no signup required. Business owners can submit a claim request from the same page (contact name, phone/email/domain, and an optional note); since no SMS/email provider is wired into this project yet, verification is manual — claims land in a pending queue reviewed from a new internal `/admin/claims` page (gated by a shared `ADMIN_API_TOKEN` secret, the pragmatic stand-in until a real admin-auth system exists) and approving one flips `Venue.claimed_by_business`. New `app_user`, `business_claim`, and `checkin` tables, all RLS-enabled with no policies (service-role only, matching every other table). 16 new unit tests. Verified end-to-end against live Phinneywood data in a browser: geofence pass/fail, cooldown enforcement, claim submission → admin approval → claim form disappearing, and the already-claimed/already-reviewed conflict guards. (`supabase/migrations/20260706040000_business_claims_and_checkins.sql`, `apps/api/src/checkins/`, `apps/api/src/claims/`, `apps/api/src/admin/requireAdmin.ts`, `apps/api/src/app.ts`, `apps/web/src/app/venues/[id]/CheckInButton.tsx`, `apps/web/src/app/venues/[id]/ClaimBusinessForm.tsx`, `apps/web/src/app/admin/claims/page.tsx`, `apps/web/src/lib/deviceId.ts`, `apps/web/src/lib/clientApi.ts`, `packages/types/src/index.ts`)

### Fixed

- **Local dev: client-side `/api/*` requests had no path to the API server.** The new check-in/claim UI is the first client-side (browser) fetching in `apps/web` — in production, Netlify's redirect (`netlify.toml`) makes `/api/*` same-origin, but locally `next dev` (port 3000) and `apps/api`'s dev server (port 4000) are separate origins with no CORS layer (deliberately removed in v0.3.1 to keep prod same-origin). Added a dev-time Next.js rewrite proxying `/api/*` to the API server, so browser fetches work locally without reintroducing CORS. No-op in production, where Netlify's own redirect handles the path first. (`apps/web/next.config.ts`)

## [0.5.2] — 2026-07-06

### Fixed

- **Venue photos rendered as broken images in production.** `apps/api/netlify/functions/api.ts` wrapped the Express app with `serverless-http` without declaring which content types are binary, so every response body — including `GET /venues/:id/photo`'s JPEG bytes — was encoded as UTF-8 text before being packaged into the Lambda-style response. Each invalid UTF-8 byte sequence in the image got replaced with the Unicode replacement character, corrupting the file even though the endpoint returned 200 with the correct `Content-Type`. Now passes `{ binary: ["image/*"] }` so image responses are base64-encoded instead. (`apps/api/netlify/functions/api.ts`)

## [0.5.1] — 2026-07-06

### Fixed

- **Deployed API returned 502 on every route, including `/health`.** `createApp()` built the venue routes' Supabase-backed repository eagerly at function cold-start, so a misconfigured or missing `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` in the deploy environment crashed the whole function before it could even serve `/health` — a route that never touched Supabase before v0.5.0. The repository and Places client are now constructed lazily on first request, so a Supabase misconfiguration only fails the `/venues*` routes (with a clean 500) instead of taking down the entire API. (`apps/api/src/app.ts`)

## [0.5.0] — 2026-07-06

### Added

- **Venue detail pages with on-demand enrichment cache.** Web pages at `/venues` (list) and `/venues/[id]` (detail) render neighborhood businesses sourced from the data layer MVP. The detail page fetches Google Place Details (ratings, price tier, reviews, photos) on first view and caches them in `VenueEnrichmentCache` with a 24-hour TTL — stale entries are transparently refreshed on subsequent views, and refresh failures fall back to whatever's cached rather than blocking the page. The API also includes a `GET /venues/:id/photo` proxy that fetches the photo via its Google reference server-side (never exposing the API key to the browser, which is critical for cost control). Built on a new `venues/` repository layer mirroring the pattern in `places/` for testability. 40 unit tests, end-to-end verified against live Phinneywood data (70+ venues, real Google enrichment with photos, ratings, reviews). (`apps/web/src/app/venues/`, `apps/api/src/venues/`, `apps/api/src/app.ts` routes, `apps/api/src/places/client.ts` Place Details client + mock, `packages/types/src/index.ts` DTOs)

## [0.4.1] — 2026-07-06

### Fixed

- **Deployed site showed the API health check as unreachable.** `apps/web`'s homepage server-fetch defaulted to `http://localhost:4000`, which doesn't exist in production, and fetched `/health` directly, a path the deployed site's `/api/*`-only redirect (`netlify.toml`) never routes to the co-located function. Now falls back to `process.env.URL` (Netlify's own auto-injected production site URL — no dashboard configuration needed) and always requests `/api/health`, which resolves correctly against both the deployed redirect and the local `apps/api` dev server. (`apps/web/src/app/page.tsx`)

## [0.4.0] — 2026-07-06

### Added

- **Google Places sync, dedup, and category normalization.** `apps/api/src/places/` implements the remaining data layer ingestion pipeline (README §1.4): a grid-tiled Google Places (New) Nearby Search restricted to the category taxonomy's Google types (chunked to stay under the API's 50-type-per-call and 20-result-per-call limits), a Levenshtein-similarity + geo-proximity dedup pass (catches duplicates against existing venues and within the same sync batch), and category matching that flags unmapped Google types for manual review instead of guessing. Business-claimed venues are treated as source-of-truth and never overwritten by re-syncs. Runnable via `npm run sync:places -- <neighborhood-slug>` in `apps/api` (mock Google client by default; real client once `GOOGLE_PLACES_API_KEY` is set — see `apps/api/GOOGLE_PLACES_SETUP.md`). Verified end-to-end against live Google data: 229 real Phinneywood businesses synced, correctly categorized, zero unmapped. 32 vitest unit tests. (`apps/api/src/places/`, `apps/api/src/scripts/syncPlaces.ts`, `apps/api/package.json`, `apps/api/tsconfig.json`, `turbo.json`, `supabase/migrations/20260706031000_neighborhood_for_sync_fn.sql`)
- **Unified category taxonomy.** 39 categories across 6 groups (Food & Drink, Retail, Health & Wellness, Services, Arts/Culture/Recreation, Lodging) mapped to Google Places types per README §2. (`supabase/migrations/20260706030000_category_taxonomy.sql`)
- **Phinneywood boundary polygon.** Hand-authored placeholder polygon around the Greenwood Ave N / Phinney Ave N corridor (README §12.4) so the sync has a real area to scope against — a stand-in until the admin boundary-drawing tool (§12.6, still on the backlog) exists. (`supabase/seed.sql`, `supabase/migrations/20260706032100_phinneywood_boundary.sql`)

### Fixed

- **Netlify Functions build failure: `serverless-http` unresolved.** Netlify treats the configured `base` directory's `package.json` (`apps/web`) as the site's dependency manifest for function bundling, even though the function code and its dependencies actually live in `apps/api` — added the function's runtime dependencies (`serverless-http`, `express`, `@supabase/supabase-js`) to `apps/web/package.json` so esbuild can resolve them. (`apps/web/package.json`, `package-lock.json`)
- **Missing Supabase grants blocked every service-role query.** The RLS-enabled tables from the initial schema migration had no explicit GRANTs to `service_role` — this project's Supabase config has `auto_expose_new_tables` off (the new default), so grants are no longer automatic — meaning every query from `apps/api` was failing with "permission denied" regardless of RLS. Granted table/sequence/function privileges to `service_role`, including for tables created after this migration. (`supabase/migrations/20260706032000_grant_service_role.sql`)
- **Invalid Google Places type strings rejected by the API.** `dry_cleaning` and `second_hand_store` aren't real Google Places (New) type values; replaced with the correct `laundry` and `thrift_store` mappings. (`supabase/migrations/20260706033000_fix_invalid_google_types.sql`)
- **Short-term rental listings flooding the venue table.** Google's `lodging`/`bed_and_breakfast` types cover any Airbnb/VRBO-style listing, not just real hotels — a live sync run confirmed 122 of 350 synced venues were vacation rentals rather than neighborhood businesses. Restricted "Hotel & Lodging" to the `hotel` type only. (`supabase/migrations/20260706034000_restrict_lodging_to_hotels.sql`)

## [0.3.2] — 2026-07-05

### Added

- **Data layer schema (partial).** Supabase migration (`supabase/migrations`) creating `Neighborhood`, `Category`, `Venue`, `POI`, and `VenueEnrichmentCache` tables on Postgres/PostGIS per README §1.3, with row-level security enabled (no policies yet — service-role key only) and a seed inserting the Phinneywood neighborhood row (`onboarding` status). Added matching shared TypeScript types to `packages/types`. Google Places sync, dedup, and category normalization remain — see `BACKLOG.md`. (`supabase/migrations`, `supabase/seed.sql`, `packages/types/src/index.ts`)
- **Google Places setup guide.** `apps/api/GOOGLE_PLACES_SETUP.md` documenting the Google Cloud project/billing/API-key steps needed before the real (non-mocked) Places sync can run. (`apps/api/GOOGLE_PLACES_SETUP.md`)

### Fixed

- **Netlify build failure on `functionsDirectory`.** `apps/web/netlify.toml` now sets `base = "apps/web"` explicitly, so the `functions = "../api/netlify/functions"` path resolves relative to `apps/web` instead of the repo root (where it was resolving one level above the repo and failing Netlify's containment check). (`apps/web/netlify.toml`)

### Removed

- **Yelp Fusion API dropped from the active plan.** Removed from README (licensing constraints, schema, ingestion pipeline, cost/attribution, build order, stack, CI/CD) and `CONTRIBUTING.md`'s licensing reminder; kept only as a documented potential future enhancement in `BACKLOG.md`. (`README.md`, `BACKLOG.md`, `CONTRIBUTING.md`)

## [0.3.1] — 2026-07-05

### Changed

- **Netlify + Supabase adopted as the hosting plan of record.** `README.md` (§9, §10.2, §10.4) now specifies Supabase (Postgres + PostGIS, Auth, Storage) for the data/auth layer and a single Netlify site for hosting, replacing the earlier Vercel/ECS-Cloud Run-Fly.io options — the weekly Google sync and Yelp cache TTL purge are planned as Netlify Scheduled Functions rather than a standalone worker process. (`README.md`)
- **`apps/api` restructured to deploy as a Netlify Function.** The Express app now lives behind `createApp()` (`apps/api/src/app.ts`) so it can be wrapped with `serverless-http` for Netlify (`apps/api/netlify/functions/api.ts`) while `apps/api/src/index.ts` still runs it locally via `app.listen`. `apps/web/netlify.toml` configures the combined site (Next.js + co-located `apps/api` function, `/api/*` redirect, same-origin — no separate API host or CORS needed). Added `apps/api/src/supabase.ts` (server-side Supabase client) and `apps/api/.env.example`. (`apps/api/src/app.ts`, `apps/api/src/index.ts`, `apps/api/netlify/functions/api.ts`, `apps/api/src/supabase.ts`, `apps/web/netlify.toml`)

### Removed

- **`cors` dependency.** No longer needed now that `apps/web` and `apps/api` deploy as one same-origin Netlify site. (`apps/api/src/app.ts`, `apps/api/package.json`)

## [0.3.0] — 2026-07-06

### Added

- **Web app scaffold.** Turborepo monorepo (`apps/web`, `apps/api`, `packages/types`) with npm workspaces, establishing the API-first foundation the rest of the build depends on. `apps/web` is Next.js (App Router) + TypeScript + Tailwind CSS; `apps/api` is an Express + TypeScript service stub; `packages/types` holds shared TypeScript types consumed by both. No auth, map, or real data yet — the homepage does a live server-side health-check round trip against `apps/api`'s `/health` endpoint to prove the two services talk to each other. (`turbo.json`, `apps/web`, `apps/api`, `packages/types`)

### Changed

- **Build/test gate documented.** `CONTRIBUTING.md` now points to `npm run build` (Turborepo, builds all workspaces) as the correctness gate, now that `apps/*` exists. (`CONTRIBUTING.md`)

## [0.2.0] — 2026-07-05

### Added

- **Backlog system.** `BACKLOG.md` tracking proposed features, improvements, known issues, and limitations, with a documented shipping workflow (branch → changelog → version bump → build → PR). Seeded with 11 build-order items reordered so the web app ships first and native apps (React Native) follow as their own tracked item. (`BACKLOG.md`)
- **Contributing guide.** `CONTRIBUTING.md` documenting project stage, where work comes from, the branch/commit/PR workflow, and a reminder to re-read the Yelp/Google licensing constraints before touching data ingestion. (`CONTRIBUTING.md`)

### Changed

- **Web-first sequencing.** `README.md` now states plainly that the web app is being built first for rapid iteration, with native apps following shortly after on the same backend; retitled §10 from "Full-Featured Web App (Built in Parallel)" to "Web App (Building First)" and added a sequencing note to §8's build order. Added a "Project status" section linking to `BACKLOG.md`, `CHANGELOG.md`, and `CONTRIBUTING.md`. (`README.md`)
- **CLAUDE.md** now documents the backlog workflow (branch naming, changelog/version bump, PR via `gh`) alongside the existing version-tracking convention. (`CLAUDE.md`)

## [0.1.0] — 2026-07-05

### Added

- **Build plan.** Initial project README documenting the full build plan: data layer and licensing constraints (Google Places, Yelp Fusion, OpenStreetMap), categorization, points of interest, check-ins, business announcements, challenges, gamification, the web app, monetization via credits, multi-neighborhood architecture, business coupons, and anonymous/authenticated user access tiers. (`README.md`)
- **Project scaffolding.** `package.json` for version tracking, `CHANGELOG.md`, and `CLAUDE.md` documenting the version-tracking convention. (`package.json`, `CHANGELOG.md`, `CLAUDE.md`)
