import type { Metadata } from "next";
import { MushroomLogo } from "@blockwise/ui";
import { MarketingNav } from "../MarketingNav";
import { MarketingFooter } from "../MarketingFooter";
import { BrandMushroom, BrandMosaic, SPOT_SHAPES } from "./BrandMushroom";

export const metadata: Metadata = {
  title: "Brand guidelines — Spored",
  description: "Logo lockups, color palette, spot count and shape, and usage guidelines for the Spored mycelial mark.",
  alternates: { canonical: "/brand" },
};

// Fixed hex palette, not the themed app's CSS variables -- same convention
// as the homepage (page.tsx): this is a standalone static page.
const INK = "#2B1B12";
const CREAM = "#FBF2E4";
const CARD = "#F5E8D3";
const ORANGE = "#E8542A";
const PURPLE = "#8B5FBF";
const MONO = "var(--font-jetbrains-mono), monospace";
const SPOT_COUNTS = [0, 1, 2, 3, 4, 5, 6];

function Eyebrow({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3.5">
      <span className="text-[13px]" style={{ fontFamily: MONO, color: "#8A7761" }}>
        {n}
      </span>
      <span className="font-heading text-[28px] font-extrabold" style={{ color: INK }}>
        {title}
      </span>
    </div>
  );
}

function Card({ children, dark, className = "" }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <div
      className={`rounded-[22px] p-8 ${className}`}
      style={{ background: dark ? INK : CARD }}
    >
      {children}
    </div>
  );
}

export default function Brand() {
  return (
    <div className="min-h-screen overflow-x-hidden font-sans" style={{ background: CREAM }}>
      <MarketingNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-[72px] px-6 py-16 md:py-[72px]">
        {/* HEADER */}
        <div className="flex flex-col gap-[18px]">
          <div className="font-heading text-[42px] font-extrabold leading-[1.05] md:text-[52px]" style={{ color: INK }}>
            Brand guidelines
          </div>
          <div className="max-w-[620px] text-[17px] leading-[1.55]" style={{ color: "#6B5744" }}>
            One mushroom, four parts. Every mark in the system — logo, favicon, avatars, neighborhood badges — is
            built from the same cap, spots, stalk, and background.
          </div>
        </div>

        {/* 01 LOGO LOCKUPS */}
        <div className="flex flex-col gap-6">
          <Eyebrow n="01" title="Logo lockups" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card className="flex flex-col items-center justify-center gap-6">
              <div className="flex items-center gap-3">
                <MushroomLogo size={40} capColor={ORANGE} stemClassName="text-[#2B1B12]" dotClassName="text-[#FBF2E4]" />
                <span className="font-heading text-[32px] font-extrabold" style={{ color: INK }}>
                  Spored
                </span>
              </div>
              <div className="text-xs" style={{ fontFamily: MONO, color: "#8A7761" }}>
                primary · horizontal · on light
              </div>
            </Card>
            <Card dark className="flex flex-col items-center justify-center gap-6">
              <div className="flex items-center gap-3">
                <MushroomLogo size={40} capColor={ORANGE} stemClassName="text-[#FBF2E4]" dotClassName="text-[#FBF2E4]" />
                <span className="font-heading text-[32px] font-extrabold" style={{ color: CREAM }}>
                  Spored
                </span>
              </div>
              <div className="text-xs" style={{ fontFamily: MONO, color: "#C9B8A0" }}>
                reversed · on dark
              </div>
            </Card>
            <Card className="flex flex-col items-center justify-center gap-[18px]">
              <div className="flex flex-col items-center gap-1.5">
                <MushroomLogo size={52} capColor={ORANGE} stemClassName="text-[#2B1B12]" dotClassName="text-[#FBF2E4]" />
                <span className="font-heading text-2xl font-extrabold" style={{ color: INK }}>
                  Spored
                </span>
              </div>
              <div className="text-xs" style={{ fontFamily: MONO, color: "#8A7761" }}>
                stacked · app splash, social
              </div>
            </Card>
            <Card className="flex flex-col items-center justify-center gap-[18px]">
              <MushroomLogo size={56} capColor={ORANGE} stemClassName="text-[#2B1B12]" dotClassName="text-[#FBF2E4]" />
              <div className="text-xs" style={{ fontFamily: MONO, color: "#8A7761" }}>
                mark only · when the name is nearby
              </div>
            </Card>
          </div>
        </div>

        {/* 02 ANATOMY */}
        <div className="flex flex-col gap-6">
          <Eyebrow n="02" title="Anatomy — four dynamic parts" />
          <div className="max-w-[640px] text-[15px] leading-[1.55]" style={{ color: "#6B5744" }}>
            The mark is generated from four independent layers. Cap, stalk, spots, and background each take their own
            color from the approved palette — stalk and spots are never forced to match — and spots additionally
            carry their own count (0–6) and shape. Any combination is valid, so users and neighborhoods can build a
            mushroom that&apos;s theirs.
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.1fr_2fr]">
            <Card dark className="flex flex-col items-center justify-center gap-4">
              <BrandMushroom size={140} cap={ORANGE} stalk={INK} spots={INK} spotCount={3} spotShape="circle" bg="#C9B3E0" />
              <div className="text-xs" style={{ fontFamily: MONO, color: "#C9B8A0" }}>
                assembled
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: "Cap", hint: "any of 8 brand hues", svg: <svg width={64} height={64} viewBox="0 0 100 100"><path d="M14 54 Q14 16 50 16 Q86 16 86 54 Z" fill={ORANGE} /></svg> },
                {
                  label: "Spots",
                  hint: "own color · count 0–6 · circle, ring, sparks, star, triangle, or cross",
                  svg: (
                    <svg width={64} height={64} viewBox="0 0 100 100">
                      <circle cx={34} cy={35} r={6} fill={INK} />
                      <circle cx={55} cy={25} r={4.5} fill={INK} />
                      <circle cx={65} cy={40} r={5.5} fill={INK} />
                    </svg>
                  ),
                },
                {
                  label: "Stalk",
                  hint: "any approved accent color",
                  svg: <svg width={64} height={64} viewBox="0 0 100 100"><rect x={40} y={30} width={20} height={45} rx={10} fill={INK} /></svg>,
                },
                {
                  label: "Background",
                  hint: "any approved accent color",
                  svg: <svg width={64} height={64} viewBox="0 0 100 100"><circle cx={50} cy={50} r={38} fill={PURPLE} opacity={0.5} /></svg>,
                },
              ].map((part) => (
                <Card key={part.label} className="flex flex-col items-center gap-3">
                  {part.svg}
                  <div className="text-center">
                    <div className="font-heading text-[16px] font-extrabold" style={{ color: INK }}>
                      {part.label}
                    </div>
                    <div className="text-[11px]" style={{ fontFamily: MONO, color: "#8A7761" }}>
                      {part.hint}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* 03 SPOT COUNT & SHAPE */}
        <div className="flex flex-col gap-6">
          <Eyebrow n="03" title="Spot count & shape" />
          <div className="max-w-[640px] text-[15px] leading-[1.55]" style={{ color: "#6B5744" }}>
            Count and shape are independent choices — any count from 0–6 pairs with any of the six shapes.
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-[11px] font-extrabold tracking-wide uppercase" style={{ fontFamily: MONO, color: "#8A7761" }}>
              Count
            </div>
            <div className="grid grid-cols-4 gap-4 md:grid-cols-7">
              {SPOT_COUNTS.map((count) => (
                <div key={count} className="flex flex-col items-center gap-2.5 rounded-[18px] px-3 py-5" style={{ background: CARD }}>
                  <BrandMushroom size={72} cap={ORANGE} stalk={INK} spots={CREAM} spotCount={count} spotShape="circle" />
                  <div className="text-[11px]" style={{ fontFamily: MONO, color: "#8A7761" }}>
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-[11px] font-extrabold tracking-wide uppercase" style={{ fontFamily: MONO, color: "#8A7761" }}>
              Shape
            </div>
            <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
              {SPOT_SHAPES.map((shape) => (
                <div key={shape} className="flex flex-col items-center gap-2.5 rounded-[18px] px-3 py-5" style={{ background: CARD }}>
                  <BrandMushroom size={72} cap={ORANGE} stalk={INK} spots={CREAM} spotCount={4} spotShape={shape} />
                  <div className="text-[11px]" style={{ fontFamily: MONO, color: "#8A7761" }}>
                    {shape}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 04 COLOR */}
        <div className="flex flex-col gap-6">
          <Eyebrow n="04" title="Color" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {[
              { name: "Chanterelle", hex: "#E8542A", note: "cap" },
              { name: "Golden", hex: "#F2A93B", note: "cap" },
              { name: "Moss", hex: "#4C8C4A", note: "cap" },
              { name: "Amethyst", hex: "#8B5FBF", note: "cap" },
              { name: "Cocoa", hex: "#2B1B12", note: "cap, stalk, text" },
              { name: "Indigo", hex: "#4A5FA5", note: "cap" },
              { name: "Russula", hex: "#B33A3A", note: "cap" },
              { name: "Blusher", hex: "#D98A9C", note: "cap" },
            ].map((c) => (
              <div key={c.name} className="overflow-hidden rounded-[18px]" style={{ border: "1px solid #E4D3B8" }}>
                <div style={{ height: 76, background: c.hex }} />
                <div className="px-3.5 py-3" style={{ background: "#FFFDF8" }}>
                  <div className="text-sm font-extrabold" style={{ color: INK }}>
                    {c.name}
                  </div>
                  <div className="text-[11px]" style={{ fontFamily: MONO, color: "#8A7761" }}>
                    {c.hex} · {c.note}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {[
              { name: "Cream", hex: "#FBF2E4", note: "background, stalk, spots" },
              { name: "Wheat", hex: "#F2D9A8", note: "background, stalk, spots" },
              { name: "Meadow", hex: "#DCEBD3", note: "background, stalk, spots" },
              { name: "Lilac", hex: "#C9B3E0", note: "background, stalk, spots" },
              { name: "Oat", hex: "#F5E8D3", note: "background, stalk, spots" },
              { name: "Sage", hex: "#C8D3BE", note: "background, stalk, spots" },
              { name: "Mist", hex: "#D8E3E8", note: "background, stalk, spots" },
              { name: "Clay", hex: "#E3C9AE", note: "background, stalk, spots" },
            ].map((c) => (
              <div key={c.name} className="overflow-hidden rounded-[18px]" style={{ border: "1px solid #E4D3B8" }}>
                <div style={{ height: 48, background: c.hex }} />
                <div className="px-3.5 py-3" style={{ background: "#FFFDF8" }}>
                  <div className="text-sm font-extrabold" style={{ color: INK }}>
                    {c.name}
                  </div>
                  <div className="text-[11px]" style={{ fontFamily: MONO, color: "#8A7761" }}>
                    {c.hex} · {c.note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 05 FAVICON & APP ICON */}
        <div className="flex flex-col gap-6">
          <Eyebrow n="05" title="Favicon & app icon" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card className="flex flex-col gap-5">
              <div className="flex items-end justify-center gap-7">
                {[16, 32, 64].map((s) => (
                  <div key={s} className="flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon.svg" width={s} height={s} alt={`favicon ${s}px`} />
                    <span className="text-[11px]" style={{ fontFamily: MONO, color: "#8A7761" }}>
                      {s}
                    </span>
                  </div>
                ))}
                <div className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon.svg"
                    width={128}
                    height={128}
                    alt="app icon"
                    className="rounded-[28px]"
                    style={{ boxShadow: "0 12px 28px -10px rgba(43,27,18,0.45)" }}
                  />
                  <span className="text-[11px]" style={{ fontFamily: MONO, color: "#8A7761" }}>
                    app icon
                  </span>
                </div>
              </div>
              <div className="text-center text-xs" style={{ fontFamily: MONO, color: "#8A7761" }}>
                icon.svg — Chanterelle cap on cocoa squircle
              </div>
            </Card>
            <Card className="flex flex-col justify-center gap-3.5">
              <div className="flex max-w-[340px] items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: "#FFFDF8", border: "1px solid #E4D3B8" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" width={18} height={18} alt="tab icon" />
                <span className="text-[13px] font-bold" style={{ color: "#6B5744" }}>
                  Spored — Phinneywood
                </span>
              </div>
              <div className="text-sm leading-[1.55]" style={{ color: "#6B5744" }}>
                Cream spots and stem on the Chanterelle cap keep the mark legible at 16px. Never use the full-color
                lockup as a favicon.
              </div>
            </Card>
          </div>
        </div>

        {/* 06 GENERATED IDENTITY */}
        <div className="flex flex-col gap-6">
          <Eyebrow n="06" title="Your mushroom — generated identity" />
          <div className="max-w-[640px] text-[15px] leading-[1.55]" style={{ color: "#6B5744" }}>
            Every member and neighborhood gets a mushroom deterministically assigned from a hash of their account,
            built from the four parts. Members can override their own with a deliberate choice from the Mushroom
            avatar section in account settings. Community mosaics tile members&apos; mushrooms into a banner for a
            business or neighborhood.
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_2fr]">
            <Card dark className="flex flex-col items-center justify-center gap-4">
              <BrandMushroom size={150} cap={PURPLE} stalk={CREAM} spots={CREAM} spotCount={3} spotShape="sparks" bg="#C9B3E0" />
              <div className="text-center text-xs" style={{ fontFamily: MONO, color: "#C9B8A0" }}>
                example specimen
              </div>
            </Card>
            <Card className="flex flex-col items-center justify-center gap-[18px]">
              <BrandMosaic cols={10} rows={3} size={44} seed={7} />
              <div className="text-xs" style={{ fontFamily: MONO, color: "#8A7761" }}>
                community mosaic · seed-generated from member mushrooms
              </div>
            </Card>
          </div>
        </div>

        {/* 07 USAGE */}
        <div className="flex flex-col gap-6">
          <Eyebrow n="07" title="Usage" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-[22px] p-7" style={{ background: "#DCEBD3" }}>
              <div className="font-heading text-lg font-extrabold" style={{ color: "#2E5C2C" }}>
                Do
              </div>
              <div className="mt-3.5 flex flex-col gap-2.5 text-sm leading-[1.5]" style={{ color: "#3A4A34" }}>
                <div>· Build every mark from the four parts — never redraw the silhouette</div>
                <div>· Use one cap hue per mark; stalk and spots each take any approved accent color</div>
                <div>· Keep clear space around the lockup equal to the cap height</div>
                <div>· Use the cocoa-squircle favicon in browser and OS contexts</div>
              </div>
            </div>
            <div className="rounded-[22px] p-7" style={{ background: "#F6DDD2" }}>
              <div className="font-heading text-lg font-extrabold" style={{ color: "#9C3A1B" }}>
                Don&apos;t
              </div>
              <div className="mt-3.5 flex flex-col gap-2.5 text-sm leading-[1.5]" style={{ color: "#6B4335" }}>
                <div>· Don&apos;t add faces, outlines, gradients, or shadows to the mushroom</div>
                <div>· Don&apos;t use colors outside the palette for cap, stalk, or background</div>
                <div>· Don&apos;t stretch, rotate, or tilt the mark</div>
                <div>· Don&apos;t put a low-contrast cap on a matching background tint</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
