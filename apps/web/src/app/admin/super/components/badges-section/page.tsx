import { BadgesSection } from "../../../../profile/[username]/BadgesSection";
import { USER_BADGES } from "../demoData";

export default function BadgesSectionDemoPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Badges section</h1>
        <p className="mt-1 text-sm text-muted">BadgesSection states, as rendered on /profile/[username].</p>
      </div>

      {USER_BADGES.map(({ label, badges }) => (
        <div key={label} className="flex flex-col gap-2">
          <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
          <BadgesSection badges={badges} />
        </div>
      ))}
    </section>
  );
}
