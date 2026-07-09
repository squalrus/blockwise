// Shared gradient progress bar used for challenge progress and profile level
// progress -- neither had a visual bar before (both were plain text).
export function ProgressBar({
  percent,
  height = 8,
}: {
  percent: number;
  height?: number;
}) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <div
      className="overflow-hidden rounded-full bg-border"
      style={{ height }}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-purple"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
