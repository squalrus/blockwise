import { MushroomLogo } from "@blockwise/ui";
import { APP_URL } from "@/lib/appUrl";
import { MarketingNav } from "./MarketingNav";
import { MarketingFooter } from "./MarketingFooter";

// Marketing landing page. Its palette is the fixed set of hex values from
// the Spored Homepage design rather than the app's light/dark CSS variables
// -- this is a standalone landing page, not a themed app screen. Links into
// the app (login/signup/neighborhoods/business) are absolute URLs since the
// app is a separate domain/deploy (see lib/appUrl.ts).
const INK = "#2B1B12";
const CREAM = "#FBF2E4";
const ORANGE = "#E8542A";
const AMBER = "#F2A93B";
const GREEN = "#4C8C4A";
const PURPLE = "#8B5FBF";

function Spore({ size, color, className, style }: { size: number; color: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={style}>
      <MushroomLogo size={size} capColor={color} stemClassName="text-[#FBF2E4]" />
    </div>
  );
}

function PillButton({
  href,
  children,
  variant,
}: {
  href: string;
  children: React.ReactNode;
  variant: "solid" | "outline-dark" | "outline-light";
}) {
  const base = "inline-block rounded-full px-7 py-4 text-base font-extrabold whitespace-nowrap";
  // Colors are set via inline style, not Tailwind classes: globals.css's
  // unlayered `a { color }` rule beats any layered Tailwind utility class on
  // an <a>, regardless of specificity, but inline styles always win.
  const variants: Record<typeof variant, { className: string; style: React.CSSProperties }> = {
    solid: { className: "bg-[#E8542A]", style: { color: CREAM } },
    "outline-dark": { className: "border-2 border-[#2B1B12]", style: { color: INK } },
    "outline-light": { className: "border-2 border-[#F5E8D3]", style: { color: "#F5E8D3" } },
  };
  const { className, style } = variants[variant];
  return (
    <a href={href} className={`${base} ${className}`} style={style}>
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden font-sans" style={{ background: CREAM }}>
      <MarketingNav />

      {/* HERO */}
      <div className="relative overflow-hidden px-5 pt-12 pb-10 md:px-6 md:pt-[90px] md:pb-[60px]">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1200 620"
          preserveAspectRatio="none"
          className="absolute inset-0 opacity-90"
          aria-hidden="true"
        >
          <path
            d="M0 460 Q220 380 460 440 Q700 500 1000 420 Q1120 390 1200 430 L1200 620 L0 620 Z"
            fill="#DCEBD3"
          />
          <path
            d="M600 60 Q560 220 620 340"
            stroke="#8B7355"
            strokeWidth="2"
            strokeDasharray="1 9"
            strokeLinecap="round"
            fill="none"
            opacity="0.35"
          />
          <path
            d="M620 340 Q700 300 760 360"
            stroke="#8B7355"
            strokeWidth="2"
            strokeDasharray="1 9"
            strokeLinecap="round"
            fill="none"
            opacity="0.35"
          />
          <path
            d="M620 340 Q540 320 480 380"
            stroke="#8B7355"
            strokeWidth="2"
            strokeDasharray="1 9"
            strokeLinecap="round"
            fill="none"
            opacity="0.35"
          />
        </svg>

        <Spore size={30} color={PURPLE} className="absolute left-[8%] top-[22%]" style={{ animation: "float-spore 5s ease-in-out infinite" }} />
        <Spore size={22} color={AMBER} className="absolute right-[12%] top-[16%]" style={{ animation: "float-spore 4.5s ease-in-out infinite 0.6s" }} />
        <Spore size={20} color={GREEN} className="absolute right-[6%] top-[52%]" style={{ animation: "float-spore 6s ease-in-out infinite 1.2s" }} />

        <div className="relative mx-auto max-w-6xl text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-[18px] py-2 text-[13px] font-extrabold"
            style={{ background: "#F5E8D3", color: "#8A7761" }}
          >
            🍄 Now sporing in Seattle
          </div>
          <div
            className="mt-[22px] font-heading text-[38px] leading-[1.05] font-extrabold md:text-[58px]"
            style={{ color: INK }}
          >
            Your neighborhood
            <br />
            is a network.
            <br />
            <span style={{ color: ORANGE }}>Grow it.</span>
          </div>
          <div
            className="mx-auto mt-5 max-w-[560px] text-[15px] leading-[1.55] md:text-[17px]"
            style={{ color: "#6B5744" }}
          >
            Check in at local spots, earn points, unlock badges, and climb the leaderboard with your
            neighbors — one storefront at a time.
          </div>
          <div className="mt-[30px] flex flex-wrap justify-center gap-3.5">
            <PillButton href={`${APP_URL}/signup`} variant="solid">
              Get the app — it&apos;s free
            </PillButton>
            <PillButton href={`${APP_URL}/neighborhoods`} variant="outline-dark">
              See your neighborhood
            </PillButton>
          </div>

          <div className="mt-10 flex justify-center md:mt-14">
            <div
              className="w-[300px] overflow-hidden rounded-[36px] border-[7px]"
              style={{
                background: CREAM,
                borderColor: INK,
                boxShadow: "0 32px 70px -20px rgba(43,27,18,0.4)",
              }}
            >
              <div className="flex items-center justify-between px-4 py-3.5" style={{ background: INK }}>
                <div className="flex items-center gap-1.5">
                  <MushroomLogo size={16} capColor={AMBER} stemClassName="text-[#FBF2E4]" />
                  <span className="font-heading text-sm font-extrabold" style={{ color: CREAM }}>
                    Spored
                  </span>
                </div>
              </div>
              <div className="px-4 pt-4 pb-[22px]">
                <div className="relative h-[130px] overflow-hidden rounded-2xl" style={{ background: "#DCEBD3" }}>
                  <svg width="100%" height="100%" viewBox="0 0 260 130" preserveAspectRatio="none" className="absolute inset-0">
                    <path d="M0 30 Q70 0 140 22 Q200 42 260 15 L260 0 L0 0 Z" fill="#F2D9A8" />
                    <path d="M0 130 Q60 82 130 112 Q200 140 260 90 L260 130 Z" fill="#C9B3E0" />
                  </svg>
                  <Spore size={14} color={ORANGE} className="absolute left-10 top-[58px]" />
                  <Spore size={12} color={GREEN} className="absolute left-[110px] top-[38px]" />
                  <Spore size={14} color={PURPLE} className="absolute left-[170px] top-[62px]" />
                </div>
                <div className="mt-3 font-heading text-xl font-extrabold" style={{ color: INK }}>
                  Phinneywood
                </div>
                <div className="text-[11px] font-bold" style={{ color: "#8A7761" }}>
                  Seattle, WA
                </div>
                <div
                  className="mt-3.5 flex items-center gap-2.5 rounded-2xl px-3 py-2.5"
                  style={{ background: INK }}
                >
                  <div
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-full font-heading text-xs font-extrabold"
                    style={{ background: AMBER }}
                  >
                    #1
                  </div>
                  <div className="flex-1 text-[13px] font-extrabold" style={{ color: CREAM }}>
                    Chad · 130 pts
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how" className="px-5 py-14 md:px-6 md:py-[90px]" style={{ background: INK }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="font-heading text-[28px] font-extrabold md:text-[38px]" style={{ color: "#F5E8D3" }}>
              How Spored works
            </div>
            <div className="mt-2.5 text-[15px]" style={{ color: "#C9B8A0" }}>
              Three steps, and your neighborhood becomes a game.
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                color: ORANGE,
                title: "1. Check in",
                body: "Walk into a local shop, café, or park and tap to check in — no scanning, no fuss.",
              },
              {
                color: AMBER,
                title: "2. Earn & unlock",
                body: "Rack up points, complete neighborhood challenges, and unlock badges as you explore.",
              },
              {
                color: PURPLE,
                title: "3. Climb the board",
                body: "Compete with neighbors for the top spot on your neighborhood's leaderboard.",
              },
            ].map((step) => (
              <div key={step.title} className="rounded-[22px] p-7" style={{ background: "#382A1E" }}>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: step.color }}
                >
                  <MushroomLogo size={26} capColor={INK} stemClassName={step.color === AMBER ? "text-[#2B1B12]" : "text-[#FBF2E4]"} />
                </div>
                <div className="mt-[18px] font-heading text-[19px] font-extrabold" style={{ color: "#F5E8D3" }}>
                  {step.title}
                </div>
                <div className="mt-2 text-sm leading-[1.55]" style={{ color: "#C9B8A0" }}>
                  {step.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LEADERBOARD TEASER */}
      <div className="px-5 py-14 md:px-6 md:py-[90px]">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="font-heading text-[28px] leading-[1.15] font-extrabold md:text-[38px]" style={{ color: INK }}>
              Every check-in counts.
              <br />
              Every neighbor competes.
            </div>
            <div className="mt-4 max-w-[460px] text-[15px] leading-[1.6]" style={{ color: "#6B5744" }}>
              Points, levels, and badges turn errands into a friendly rivalry — Founder badges for early
              sporers, streaks for regulars, and a leaderboard that resets each season.
            </div>
            <div className="mt-[26px] flex flex-wrap gap-7">
              {[
                { value: "154", label: "Businesses in Phinneywood", color: ORANGE },
                { value: "11", label: "Check-ins this week", color: GREEN },
                { value: "4", label: "Active challenges", color: PURPLE },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-heading text-[30px] font-extrabold" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="text-xs font-bold" style={{ color: "#8A7761" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl p-[26px]" style={{ background: "#F5E8D3" }}>
            <div className="mb-3.5 font-heading text-[15px] font-extrabold" style={{ color: INK }}>
              🏆 Phinneywood leaderboard
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: INK }}>
                <div className="w-6 font-heading text-base font-extrabold" style={{ color: AMBER }}>
                  #1
                </div>
                <MushroomLogo size={26} capColor={AMBER} stemClassName="text-[#FBF2E4]" />
                <div className="flex-1 text-[15px] font-extrabold" style={{ color: CREAM }}>
                  Chad
                </div>
                <div className="font-heading text-[15px] font-extrabold" style={{ color: AMBER }}>
                  130 pts
                </div>
              </div>
              {[
                { rank: "#2", name: "Nora W", pts: "40 pts" },
                { rank: "#3", name: "Marcus L", pts: "28 pts" },
              ].map((row) => (
                <div
                  key={row.rank}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: CREAM }}
                >
                  <div className="w-6 text-base font-extrabold" style={{ color: "#8A7761" }}>
                    {row.rank}
                  </div>
                  <div className="h-[26px] w-[26px] rounded-full" style={{ background: "#DCCBA8" }} />
                  <div className="flex-1 text-[15px] font-bold" style={{ color: "#4A3B2C" }}>
                    {row.name}
                  </div>
                  <div className="text-[15px] font-extrabold" style={{ color: "#4A3B2C" }}>
                    {row.pts}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* NEIGHBORHOOD MAP / COVERAGE */}
      <div id="neighborhoods" className="px-5 py-14 md:px-6 md:py-[90px]" style={{ background: "#DCEBD3" }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="font-heading text-[28px] font-extrabold md:text-[38px]" style={{ color: INK }}>
              Find your patch of the network
            </div>
            <div className="mx-auto mt-2.5 max-w-[560px] text-[15px]" style={{ color: "#4A3B2C" }}>
              Every neighborhood is its own mycelial cluster — join yours, or start one for a block that
              hasn&apos;t sporad yet.
            </div>
          </div>

          <div
            className="relative mt-10 h-[260px] overflow-hidden rounded-[28px] md:h-[380px]"
            style={{ background: "#C9DDC0" }}
          >
            <svg width="100%" height="100%" viewBox="0 0 1100 380" preserveAspectRatio="none" className="absolute inset-0">
              <path d="M0 100 Q220 40 460 90 Q700 140 1100 60 L1100 0 L0 0 Z" fill="#F2D9A8" />
              <path d="M0 380 Q200 260 460 320 Q700 380 1100 260 L1100 380 Z" fill="#C9B3E0" />
              <path
                d="M120 300 Q220 200 340 240 Q400 160 500 210 Q560 150 660 200 Q720 150 820 190"
                stroke="#8B7355"
                strokeWidth="2"
                strokeDasharray="1 8"
                strokeLinecap="round"
                fill="none"
                opacity="0.45"
              />
            </svg>
            <Spore size={30} color={ORANGE} className="absolute left-[14%] top-[38%]" />
            <Spore size={26} color={GREEN} className="absolute left-[32%] top-[22%]" />
            <Spore size={30} color={PURPLE} className="absolute left-[48%] top-[48%]" />
            <Spore size={24} color={AMBER} className="absolute left-[64%] top-[28%]" />
            <Spore size={26} color={ORANGE} className="absolute left-[78%] top-[52%]" />

            <div
              className="absolute translate-x-[-50%] translate-y-[26px] rounded-full px-3 py-1.5 text-xs font-extrabold whitespace-nowrap"
              style={{ left: "14%", top: "38%", background: INK, color: CREAM }}
            >
              Phinneywood
            </div>
            <div
              className="absolute translate-x-[-50%] translate-y-[26px] rounded-full px-3 py-1.5 text-xs font-extrabold whitespace-nowrap"
              style={{ left: "64%", top: "28%", background: INK, color: CREAM }}
            >
              Capitol Hill
            </div>
          </div>

          <div className="mt-7 flex justify-center">
            <a
              href={`${APP_URL}/neighborhoods`}
              className="rounded-full px-7 py-[15px] text-[15px] font-extrabold"
              style={{ background: INK, color: CREAM }}
            >
              Browse all 154 neighborhoods
            </a>
          </div>
        </div>
      </div>

      {/* BUSINESS PITCH */}
      <div id="business" className="px-5 py-14 md:px-6 md:py-[90px]">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 md:grid-cols-[1fr_1.1fr]">
          <div className="rounded-3xl p-7" style={{ background: "#F5E8D3" }}>
            <div className="mb-3.5 flex flex-wrap items-center gap-2">
              <div
                className="rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                style={{ background: AMBER, color: INK }}
              >
                Bar
              </div>
              <div
                className="rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                style={{ background: GREEN, color: CREAM }}
              >
                Open now
              </div>
            </div>
            <div className="font-heading text-[22px] font-extrabold" style={{ color: INK }}>
              74th St Ale House
            </div>
            <div className="mt-1 text-[12.5px] font-bold" style={{ color: "#8A7761" }}>
              7401 Greenwood Ave N, Seattle, WA
            </div>
            <div className="mt-[18px] rounded-2xl p-4" style={{ background: CREAM }}>
              <div className="text-[13px] font-extrabold" style={{ color: INK }}>
                Own this business?
              </div>
              <div className="mt-2.5 flex flex-col gap-2">
                <div
                  className="rounded-[10px] border-2 px-3 py-2.5 text-[12.5px] font-bold"
                  style={{ background: "#F5E8D3", borderColor: "#E4D3B8", color: "#8A7761" }}
                >
                  Your name
                </div>
                <a
                  href={`${APP_URL}/business`}
                  className="rounded-[10px] py-2.5 text-center text-[13px] font-extrabold"
                  style={{ background: PURPLE, color: CREAM }}
                >
                  Submit claim
                </a>
              </div>
            </div>
          </div>
          <div>
            <div className="font-heading text-[28px] leading-[1.15] font-extrabold md:text-[38px]" style={{ color: INK }}>
              Your storefront, on the map — for free
            </div>
            <div className="mt-4 max-w-[460px] text-[15px] leading-[1.6]" style={{ color: "#6B5744" }}>
              Claim your listing and turn every regular into a repeat visitor. See who&apos;s checking in,
              run neighborhood challenges, and show up where locals are already looking.
            </div>
            <div className="mt-[22px] flex flex-col gap-3.5">
              {[
                { icon: "📍", text: "Show up in neighborhood check-in lists" },
                { icon: "🎯", text: "Run challenges that reward customer visits" },
                { icon: "⭐", text: "Collect reviews from real, checked-in neighbors" },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-bold" style={{ color: "#4A3B2C" }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
            <a
              href={`${APP_URL}/business`}
              className="mt-[26px] inline-block rounded-full px-7 py-[15px] text-[15px] font-extrabold"
              style={{ background: INK, color: CREAM }}
            >
              Claim your business
            </a>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="relative overflow-hidden px-5 py-14 text-center md:px-6 md:py-[90px]" style={{ background: INK }}>
        <Spore size={26} color={AMBER} className="absolute left-[10%] top-[24%]" style={{ animation: "float-spore 5.5s ease-in-out infinite" }} />
        <Spore size={22} color={PURPLE} className="absolute right-[12%] top-[60%]" style={{ animation: "float-spore 4.8s ease-in-out infinite 0.8s" }} />
        <div className="font-heading text-[28px] font-extrabold md:text-[38px]" style={{ color: "#F5E8D3" }}>
          Ready to spore up your block?
        </div>
        <div className="mt-3 text-[15px]" style={{ color: "#C9B8A0" }}>
          Free to join. Your neighborhood is waiting.
        </div>
        <div className="mt-[26px] flex flex-wrap justify-center gap-3.5">
          <PillButton href={`${APP_URL}/signup`} variant="solid">
            Get the app
          </PillButton>
          <PillButton href={`${APP_URL}/neighborhoods`} variant="outline-light">
            Browse neighborhoods
          </PillButton>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
