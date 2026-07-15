import type { AvatarStyle, MushroomCustomization } from "@blockwise/types";
import { MushroomMark, resolveMushroomConfig } from "@blockwise/ui";
import type { MushroomConfig, SpotShape } from "@blockwise/ui";

// Shared avatar rendering (BACKLOG.md "Show profile picture from Google" /
// "Mushroom avatars"): shows the social photo when avatarStyle is "social"
// and one is on file, otherwise the account's mushroom -- a saved
// customizer choice (BACKLOG.md Ref 75) if one exists, else the randomly-
// assigned default (deterministic from `seed`, normally the user's id).
// Never a bare monogram, since every user always has a seed to render a
// mushroom from.
export function Avatar({
  avatarUrl,
  avatarStyle,
  mushroomCustomization = null,
  seed,
  label,
  size = 40,
}: {
  avatarUrl: string | null;
  avatarStyle: AvatarStyle;
  mushroomCustomization?: MushroomCustomization | null;
  seed: string;
  label: string;
  size?: number;
}) {
  if (avatarStyle === "social" && avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={label}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  // Server-validated against the same enum a customizer save is checked
  // against (PATCH /me/profile), so the spotShape string is safe to trust as
  // a SpotShape here.
  const config: MushroomConfig | null = mushroomCustomization
    ? { ...mushroomCustomization, spotShape: mushroomCustomization.spotShape as SpotShape }
    : null;
  const mushroom = resolveMushroomConfig(seed, config);
  return (
    <MushroomMark
      size={size}
      cap={mushroom.cap}
      stalk={mushroom.stalk}
      spots={mushroom.spots}
      spotCount={mushroom.spotCount}
      spotShape={mushroom.spotShape}
      bg={mushroom.bg}
    />
  );
}
