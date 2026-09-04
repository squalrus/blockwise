# Changelog

User-visible changes, newest first. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and [semver](https://semver.org/) versioning.

## [0.86.0] — 2026-09-03

### Added
- **Nightly auto-sync for neighborhood event feeds.** A neighborhood admin can turn on nightly auto-sync for a saved iCal/webcal feed instead of clicking "Sync now" by hand. Newly-imported events default to a "pending" status requiring admin review (Approve or Hide) unless a per-feed "trust this feed" toggle is on, in which case they publish immediately as before. The Events sidebar tab now shows a pending-count badge, mirroring the existing Business claims badge. (`apps/api/netlify/functions/ical-nightly-sync.ts`, `apps/api/src/events/`, `apps/api/src/neighborhoods/`, `apps/web/src/app/admin/neighborhood/[neighborhoodSlug]/IcalFeedForm.tsx`, `.../events/page.tsx`, `.../layout.tsx`)
- **"+ New event" opens a modal.** Creating an event on the neighborhood Events tab now opens a modal instead of pushing an inline form into the page layout. (`apps/web/src/app/admin/neighborhood/[neighborhoodSlug]/events/page.tsx`, `EventForm.tsx`)

### Changed
- **Deleting an event is now restricted to manually-created events.** A calendar-imported event can only be hidden or approved, never deleted, since a future re-sync would just recreate it. Applies on both the neighborhood-admin and business Events tabs. (`apps/api/src/events/events.ts`, `apps/web/src/app/admin/neighborhood/[neighborhoodSlug]/events/page.tsx`, `apps/web/src/app/admin/business/[venueId]/events/page.tsx`)
- **Renamed "Super admin mode" to "Super admin"** in the admin switcher. (`apps/web/src/app/AdminSwitcher.tsx`)
- **Neighborhood Events tab layout is now responsive**, giving the calendar feeds panel more room on smaller screens. (`apps/web/src/app/admin/neighborhood/[neighborhoodSlug]/events/page.tsx`)

### Fixed
- **Admin modals no longer show a horizontal scrollbar or render stuck in the upper-left corner.** (`apps/web/src/app/admin/AdminModal.tsx`)
