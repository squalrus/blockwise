import { JoinNeighborhoodButton } from "../../../neighborhoods/[slug]/JoinNeighborhoodButton";
import { NeighborhoodSummaryCard } from "../../../neighborhoods/[slug]/NeighborhoodSummaryCard";
import { NEIGHBORHOOD_CARDS } from "../demoData";

export default function NeighborhoodCardDemoPage() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Neighborhood card</h1>
        <p className="mt-1 text-sm text-muted">NeighborhoodSummaryCard, as rendered on /neighborhoods/[slug].</p>
      </div>

      <div className="flex flex-col gap-6">
        {NEIGHBORHOOD_CARDS.map(({ label, neighborhood: n, joined }) => (
          <div key={n.id} className="flex flex-col gap-2">
            <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
            <NeighborhoodSummaryCard
              neighborhood={n}
              actions={<JoinNeighborhoodButton neighborhoodId={n.id} mockJoined={joined} />}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
