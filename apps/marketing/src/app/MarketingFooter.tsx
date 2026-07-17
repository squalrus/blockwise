import { MushroomLogo } from "@blockwise/ui";

const AMBER = "#F2A93B";

export function MarketingFooter() {
  return (
    <div className="px-6 py-8" style={{ background: "#1B120C" }}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MushroomLogo size={18} capColor={AMBER} stemClassName="text-[#FBF2E4]" />
          <span className="font-heading text-[15px] font-extrabold" style={{ color: "#F5E8D3" }}>
            Spored
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a href="/brand" className="text-[12.5px] font-bold" style={{ color: "#8A7761" }}>
            Brand
          </a>
          <a href="/faq" className="text-[12.5px] font-bold" style={{ color: "#8A7761" }}>
            FAQ
          </a>
          <a href="/terms" className="text-[12.5px] font-bold" style={{ color: "#8A7761" }}>
            Terms
          </a>
          <a href="/privacy" className="text-[12.5px] font-bold" style={{ color: "#8A7761" }}>
            Privacy
          </a>
          <div className="text-[12.5px] font-bold" style={{ color: "#8A7761" }}>
            © 2026 Spored. Grown locally.
          </div>
        </div>
      </div>
    </div>
  );
}
