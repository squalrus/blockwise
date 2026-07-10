import { MushroomLogo } from "@blockwise/ui";

const PINS = [
  { left: "14%", top: "45%", size: 18, color: "var(--brand-orange)" },
  { left: "43%", top: "30%", size: 16, color: "var(--brand-green)" },
  { left: "63%", top: "48%", size: 20, color: "var(--brand-purple)" },
  { left: "80%", top: "28%", size: 16, color: "var(--brand-amber)" },
];

// Purely decorative header banner (BACKLOG.md Ref 44's neighborhood profile
// header) evoking the mycelial-network idea: a stylized two-tone map with a
// scattering of mushroom pins standing in for venues, not tied to real venue
// coordinates. Land/water tones swap to a moodier dark-theme palette (see
// globals.css's dark media query) via the fill-*/stroke-* dark: utilities
// below, since raw SVG fill/stroke attributes can't respond to prefers-
// color-scheme on their own.
export function NeighborhoodMapArt() {
  return (
    <div className="relative h-[172px] overflow-hidden rounded-2xl bg-[#DCEBD3] dark:bg-[#1A2A1E]">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 350 172"
        preserveAspectRatio="none"
        className="absolute inset-0"
      >
        <path
          d="M0 40 Q90 0 180 30 Q260 55 350 20 L350 0 L0 0 Z"
          className="fill-[#F2D9A8] dark:fill-[#3A2E1C]"
        />
        <path
          d="M0 172 Q80 110 170 150 Q260 185 350 120 L350 172 Z"
          className="fill-[#C9B3E0] dark:fill-[#2E2440]"
        />
        <path
          d="M40 172 Q60 90 140 100 Q170 60 230 90 Q260 60 300 90"
          strokeWidth="2"
          strokeDasharray="1 7"
          strokeLinecap="round"
          fill="none"
          className="stroke-[#8B7355] opacity-60 dark:stroke-[#6BBF5E] dark:opacity-50"
        />
      </svg>
      {PINS.map((pin, index) => (
        <div key={index} className="absolute" style={{ left: pin.left, top: pin.top }}>
          <MushroomLogo size={pin.size} capColor={pin.color} />
        </div>
      ))}
    </div>
  );
}
