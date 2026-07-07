// Shared avatar rendering (BACKLOG.md "Show profile picture from Google"):
// shows avatar_url when set, otherwise a monogram of the display name/
// username so a profile never renders as a bare empty circle.
export function Avatar({
  avatarUrl,
  label,
  size = 40,
}: {
  avatarUrl: string | null;
  label: string;
  size?: number;
}) {
  if (avatarUrl) {
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

  const initial = label.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={label}
    >
      {initial}
    </div>
  );
}
