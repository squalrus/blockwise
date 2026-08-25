import { TopCapsSection } from "../../../../profile/[username]/TopCapsSection";
import { TOP_CAPS_STATES } from "../demoData";

export default function TopCapsDemoPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Top Caps section</h1>
        <p className="mt-1 text-sm text-muted">TopCapsSection states, as rendered on /profile/[username].</p>
      </div>

      {TOP_CAPS_STATES.map(({ label, topCaps }) => (
        <div key={label} className="flex flex-col gap-2">
          <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
          {topCaps.length === 0 ? (
            <p className="text-sm text-muted italic">(renders nothing)</p>
          ) : (
            <TopCapsSection topCaps={topCaps} />
          )}
        </div>
      ))}
    </section>
  );
}
