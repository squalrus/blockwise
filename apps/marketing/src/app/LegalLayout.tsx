import { MarketingNav } from "./MarketingNav";
import { MarketingFooter } from "./MarketingFooter";

// Shared shell for the Terms/Privacy static content pages -- same nav/footer
// and fixed hex palette as the rest of the marketing site (see page.tsx),
// just a narrower reading-width container and plain heading/paragraph
// styling instead of the homepage's illustrated sections.
const INK = "#2B1B12";
const CREAM = "#FBF2E4";
const MUTED = "#8A7761";
const BODY = "#6B5744";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden font-sans" style={{ background: CREAM }}>
      <MarketingNav />
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16 md:py-[72px]">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-[36px] font-extrabold md:text-[44px]" style={{ color: INK }}>
            {title}
          </h1>
          <p className="text-sm font-bold" style={{ color: MUTED }}>
            Last updated {updated}
          </p>
        </div>
        <div className="flex flex-col gap-8 text-[15px] leading-[1.7]" style={{ color: BODY }}>
          {children}
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-[20px] font-extrabold" style={{ color: INK }}>
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
