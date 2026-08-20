import Link from "next/link";
import { MushroomLogo } from "@blockwise/ui";
import { APP_URL } from "@/lib/appUrl";

// Shared chrome for every apps/marketing page (homepage, /brand, and future
// terms/privacy/FAQ pages) -- see page.tsx's note on the fixed hex palette.
const CREAM = "#FBF2E4";
const ORANGE = "#E8542A";

export function MarketingNav() {
  return (
    <div className="sticky top-0 z-50 backdrop-blur-sm" style={{ background: "rgba(43,27,18,0.96)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <MushroomLogo size={28} capColor={ORANGE} stemClassName="text-[#FBF2E4]" />
          <span className="font-heading text-xl font-extrabold" style={{ color: CREAM }}>
            Spored
          </span>
          {/* BETA tag: remove this (and the matching ones in Footer.tsx and
              both admin sidebar layouts) once v1.0.0 ships. */}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide"
            style={{ background: "rgba(232,84,42,0.18)", color: ORANGE }}
          >
            BETA
          </span>
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          <Link href="/#how" className="text-sm font-bold" style={{ color: "#E4D3B8" }}>
            How it works
          </Link>
          <Link href="/#neighborhoods" className="text-sm font-bold" style={{ color: "#E4D3B8" }}>
            Neighborhoods
          </Link>
          <Link href="/#business" className="text-sm font-bold" style={{ color: "#E4D3B8" }}>
            For businesses
          </Link>
          <Link href="/brand" className="text-sm font-bold" style={{ color: "#E4D3B8" }}>
            Brand
          </Link>
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
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
