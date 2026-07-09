import { NeighborhoodsSection } from "./NeighborhoodsSection";

// Split out from the landing page (BACKLOG.md "Neighborhoods on landing page
// and user profile") so "/" can stay a simple stub while this page owns
// neighborhood browsing/join-leave going forward.
export default function NeighborhoodsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-background p-4 font-sans sm:p-16">
      <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Neighborhoods</h1>
      <NeighborhoodsSection />
    </div>
  );
}
