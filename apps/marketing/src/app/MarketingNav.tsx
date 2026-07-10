import { MushroomLogo } from "@blockwise/ui";
import { APP_URL } from "@/lib/appUrl";

// Shared chrome for every apps/marketing page (homepage, /brand, and future
// terms/privacy/FAQ pages) -- see page.tsx's note on the fixed hex palette.
const CREAM = "#FBF2E4";
const AMBER = "#F2A93B";
const ORANGE = "#E8542A";

export function MarketingNav() {
  return (
    <div className="sticky top-0 z-50 backdrop-blur-sm" style={{ background: "rgba(43,27,18,0.96)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <a href="/" className="flex items-center gap-2.5">
          <MushroomLogo size={28} capColor={AMBER} stemClassName="text-[#FBF2E4]" />
          <span className="font-heading text-xl font-extrabold" style={{ color: CREAM }}>
            Spored
          </span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          <a href="/#how" className="text-sm font-bold" style={{ color: "#E4D3B8" }}>
            How it works
          </a>
          <a href="/#neighborhoods" className="text-sm font-bold" style={{ color: "#E4D3B8" }}>
            Neighborhoods
          </a>
          <a href="/#business" className="text-sm font-bold" style={{ color: "#E4D3B8" }}>
            For businesses
          </a>
          <a href="/brand" className="text-sm font-bold" style={{ color: "#E4D3B8" }}>
            Brand
          </a>
        </div>
        <div className="flex items-center gap-2.5">
          <a href={`${APP_URL}/login`} className="hidden text-sm font-bold md:inline" style={{ color: "#E4D3B8" }}>
            Sign in
          </a>
          <a
            href={`${APP_URL}/signup`}
            className="rounded-full px-[18px] py-2.5 text-[13px] font-extrabold whitespace-nowrap"
            style={{ background: ORANGE, color: CREAM }}
          >
            Get the app
          </a>
        </div>
      </div>
    </div>
  );
}
