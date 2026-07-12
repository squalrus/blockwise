import type { AvatarStyle } from "@blockwise/types";
import { MushroomMark, mushroomConfigForUser } from "@blockwise/ui";

// Shared avatar rendering (BACKLOG.md "Show profile picture from Google" /
// "Mushroom avatars"): shows the social photo when avatarStyle is "social"
// and one is on file, otherwise the account's randomly-assigned mushroom
// (deterministic from `seed`, normally the user's id) -- never a bare
// monogram, since every user always has a seed to render a mushroom from.
export function Avatar({
  avatarUrl,
  avatarStyle,
  seed,
  label,
  size = 40,
}: {
  avatarUrl: string | null;
  avatarStyle: AvatarStyle;
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

  const mushroom = mushroomConfigForUser(seed);
  return (
    <MushroomMark
      size={size}
      cap={mushroom.cap}
      stalk={mushroom.stalk}
      spots={mushroom.stalk}
      pattern={mushroom.pattern}
      bg="var(--card)"
      bgShape="circle"
    />
  );
}
