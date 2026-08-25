import { ActivityFeed } from "../../../../ActivityFeed";
import { ACTIVITY_FEED_STATES } from "../demoData";

export default function ActivityFeedDemoPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Activity feed</h1>
        <p className="mt-1 text-sm text-muted">
          ActivityFeed states, as rendered on /location/[id], /neighborhoods/[slug]&apos;s Spore Feed tab, and
          /account&apos;s Spore Feed + My Activity tabs. Empty, one row per ActivityType in isolation, and a
          combined multi-day view mixing all six.
        </p>
      </div>

      {ACTIVITY_FEED_STATES.map(({ label, items }) => (
        <div key={label} className="flex flex-col gap-2">
          <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
          <ActivityFeed items={items} emptyMessage="No activity yet." />
        </div>
      ))}
    </section>
  );
}
