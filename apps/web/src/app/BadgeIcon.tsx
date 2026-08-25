// Maps a badge's plain-text icon code (BACKLOG.md Ref 42) to an emoji glyph
// so earned badges have a visual identity instead of just a name in a list.
// Unrecognized/missing codes fall back to a generic medal rather than
// rendering nothing. Exported so the admin Badges/Challenges forms
// (admin/super/badges, admin/neighborhood/[neighborhoodSlug]/challenges) can
// build an icon-code <select> from the same source of truth instead of a
// free-text input -- a new icon added here automatically shows up there too.
export const BADGE_ICONS: Record<string, string> = {
  coffee: "☕",
  compass: "🧭",
  star: "⭐",
  beer: "🍺",
  bread: "🥖",
  "shopping-bag": "🛍️",
  utensils: "🍽️",
  heart: "❤️",
  map: "🗺️",
  wine: "🍷",
  "ice-cream": "🍦",
  zap: "⚡",
  repeat: "🔁",
  mushroom: "🍄",
  seedling: "🌱",
  handshake: "🤝",
  calendar: "📅",
  megaphone: "📣",
  wrench: "🔧",
  crown: "👑",
};

const FALLBACK_ICON = "🏅";

export function BadgeIcon({ icon, name }: { icon: string | null; name: string }) {
  const glyph = (icon && BADGE_ICONS[icon]) || FALLBACK_ICON;
  return (
    <span role="img" aria-label={`${name} badge`} title={name}>
      {glyph}
    </span>
  );
}
