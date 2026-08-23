import Link from "next/link";
import { MushroomLogo } from "@blockwise/ui";
import { MarketingNav } from "./MarketingNav";
import { MarketingFooter } from "./MarketingFooter";

// Same content/copy as apps/web's not-found.tsx, styled with marketing's
// fixed hex palette (see page.tsx) instead of the app's CSS-variable tokens,
// and wrapped in the marketing site's nav/footer chrome like every other
// top-level page here.
const INK = "#2B1B12";
const CREAM = "#FBF2E4";
const ORANGE = "#E8542A";
const MUTED = "#8A7761";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden font-sans" style={{ background: CREAM }}>
      <MarketingNav />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 p-4 text-center sm:p-16">
        <MushroomLogo size={64} capColor={ORANGE} />
        <h1 className="font-heading text-2xl font-extrabold" style={{ color: INK }}>
          Page not found
        </h1>
        <p className="text-sm" style={{ color: MUTED }}>
          We looked around but couldn&apos;t find what you were after. It may have moved, or never existed.
        </p>
        <Link
          href="/"
          className="mt-1 rounded-full px-4 py-2 text-sm font-extrabold"
          style={{ background: ORANGE, color: CREAM }}
        >
          Back to home
        </Link>
      </div>
      <MarketingFooter />
    </div>
  );
}
