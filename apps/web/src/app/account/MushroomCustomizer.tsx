"use client";

import { useState, type ReactNode } from "react";
import {
  MUSHROOM_CAPS,
  MUSHROOM_SPOT_COUNTS,
  MUSHROOM_SPOT_SHAPES,
  MUSHROOM_STALK_BASE_OPTIONS,
  MUSHROOM_STALK_CLAY,
  MUSHROOM_STALK_COCOA,
  MUSHROOM_STALK_CREAM,
  MUSHROOM_STALK_LILAC,
  MUSHROOM_STALK_MEADOW,
  MUSHROOM_STALK_MIST,
  MUSHROOM_STALK_OAT,
  MUSHROOM_STALK_SAGE,
  MUSHROOM_STALK_WHEAT,
  MushroomMark,
} from "@blockwise/ui";
import type { MushroomConfig, SpotShape } from "@blockwise/ui";

const STALK_LABELS: Record<string, string> = {
  [MUSHROOM_STALK_CREAM]: "Cream",
  [MUSHROOM_STALK_COCOA]: "Cocoa",
  [MUSHROOM_STALK_WHEAT]: "Wheat",
  [MUSHROOM_STALK_MEADOW]: "Meadow",
  [MUSHROOM_STALK_LILAC]: "Lilac",
  [MUSHROOM_STALK_OAT]: "Oat",
  [MUSHROOM_STALK_SAGE]: "Sage",
  [MUSHROOM_STALK_MIST]: "Mist",
  [MUSHROOM_STALK_CLAY]: "Clay",
};

const SPOT_SHAPE_LABELS: Record<SpotShape, string> = {
  circle: "Circle",
  ring: "Ring",
  sparks: "Sparks",
  star: "Star",
  triangle: "Triangle",
  cross: "Cross",
};

type SectionKey = "cap" | "stalk" | "spots" | "background" | "spotCount" | "spotShape";

// BACKLOG.md Ref 75 "Mushroom avatar customizer" -- swatch pickers for the
// account's mushroom look (cap, stalk, spots, background, spot count, spot
// shape), rendered by MushroomSection.tsx as its own always-visible account
// settings section (not gated on avatar_style). Stalk, spots, and background
// are independent choices (not one mirroring another), as are spot count
// (0-6) and spot shape (circle/ring/sparks/star/triangle/cross) -- any count
// pairs with any shape -- rather than a fused named pattern. Background only
// affects Avatar rendering's backdrop circle -- MushroomField's decorative
// growing-field icons never render one, customized or not.
//
// Each swatch category collapses into its own accordion section (only one
// open at a time) rather than six always-expanded rows stacked below the
// preview -- with every row open, picking a swatch near the bottom (e.g.
// Spot shape) pushed the live preview above well out of view, so seeing the
// result of that pick meant scrolling back up. Capping the expanded content
// to one section keeps the preview close by no matter which category is
// being tweaked.
export function MushroomCustomizer({
  value,
  isCustomized,
  onChange,
  onReset,
}: {
  value: MushroomConfig;
  isCustomized: boolean;
  onChange: (next: MushroomConfig) => void;
  onReset: () => void;
}) {
  const accentOptions = MUSHROOM_STALK_BASE_OPTIONS;
  const [openSection, setOpenSection] = useState<SectionKey | null>("cap");

  function toggle(section: SectionKey) {
    setOpenSection((current) => (current === section ? null : section));
  }

  function selectCap(cap: string) {
    onChange({ ...value, cap });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">Customize your mushroom</span>
        {isCustomized && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-bold text-brand-purple hover:text-brand-orange"
          >
            Use auto-assigned look
          </button>
        )}
      </div>

      <div className="flex justify-center">
        <MushroomMark
          size={120}
          cap={value.cap}
          stalk={value.stalk}
          spots={value.spots}
          spotCount={value.spotCount}
          spotShape={value.spotShape}
          bg={value.bg}
        />
      </div>

      <div className="flex flex-col gap-2">
        <CollapsibleSection
          label="Cap"
          isOpen={openSection === "cap"}
          onToggle={() => toggle("cap")}
          summary={<SwatchDot color={value.cap} />}
        >
          {MUSHROOM_CAPS.map((cap) => (
            <ColorSwatch key={cap} color={cap} selected={cap === value.cap} onClick={() => selectCap(cap)} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          label="Stalk"
          isOpen={openSection === "stalk"}
          onToggle={() => toggle("stalk")}
          summary={<SwatchDot color={value.stalk} />}
        >
          {accentOptions.map((stalk) => (
            <ColorSwatch
              key={stalk}
              color={stalk}
              selected={stalk === value.stalk}
              title={STALK_LABELS[stalk]}
              onClick={() => onChange({ ...value, stalk })}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          label="Spots"
          isOpen={openSection === "spots"}
          onToggle={() => toggle("spots")}
          summary={<SwatchDot color={value.spots} />}
        >
          {accentOptions.map((spots) => (
            <ColorSwatch
              key={spots}
              color={spots}
              selected={spots === value.spots}
              title={STALK_LABELS[spots]}
              onClick={() => onChange({ ...value, spots })}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          label="Background"
          isOpen={openSection === "background"}
          onToggle={() => toggle("background")}
          summary={<SwatchDot color={value.bg} />}
        >
          {accentOptions.map((bg) => (
            <ColorSwatch
              key={bg}
              color={bg}
              selected={bg === value.bg}
              title={STALK_LABELS[bg]}
              onClick={() => onChange({ ...value, bg })}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          label="Spot count"
          isOpen={openSection === "spotCount"}
          onToggle={() => toggle("spotCount")}
          summary={<span className="text-xs font-bold text-muted">{value.spotCount}</span>}
        >
          {MUSHROOM_SPOT_COUNTS.map((spotCount) => (
            <button
              key={spotCount}
              type="button"
              title={`${spotCount} spot${spotCount === 1 ? "" : "s"}`}
              aria-label={`${spotCount} spot${spotCount === 1 ? "" : "s"}`}
              onClick={() => onChange({ ...value, spotCount })}
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 bg-card ${
                spotCount === value.spotCount ? "border-brand-purple" : "border-transparent"
              }`}
            >
              <MushroomMark
                size={34}
                cap={value.cap}
                stalk={value.stalk}
                spots={value.spots}
                spotCount={spotCount}
                spotShape={value.spotShape}
              />
            </button>
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          label="Spot shape"
          isOpen={openSection === "spotShape"}
          onToggle={() => toggle("spotShape")}
          summary={<span className="text-xs font-bold text-muted">{SPOT_SHAPE_LABELS[value.spotShape]}</span>}
        >
          {MUSHROOM_SPOT_SHAPES.map((spotShape) => (
            <button
              key={spotShape}
              type="button"
              title={SPOT_SHAPE_LABELS[spotShape]}
              aria-label={SPOT_SHAPE_LABELS[spotShape]}
              onClick={() => onChange({ ...value, spotShape })}
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 bg-card ${
                spotShape === value.spotShape ? "border-brand-purple" : "border-transparent"
              }`}
            >
              <MushroomMark
                size={34}
                cap={value.cap}
                stalk={value.stalk}
                spots={value.spots}
                spotCount={Math.max(value.spotCount, 1)}
                spotShape={spotShape}
              />
            </button>
          ))}
        </CollapsibleSection>
      </div>
    </div>
  );
}

function CollapsibleSection({
  label,
  isOpen,
  onToggle,
  summary,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <span className="flex-1 text-[11px] font-bold tracking-wide text-muted uppercase">{label}</span>
        {summary}
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M1 1 L5 5 L9 1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {isOpen && <div className="flex flex-wrap gap-2.5 px-3 pb-3">{children}</div>}
    </div>
  );
}

function SwatchDot({ color }: { color: string }) {
  return <span className="h-4 w-4 shrink-0 rounded-full border border-border" style={{ backgroundColor: color }} />;
}

function ColorSwatch({
  color,
  selected,
  title,
  onClick,
}: {
  color: string;
  selected: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title ?? color}
      onClick={onClick}
      className={`h-11 w-11 rounded-full border-2 ${selected ? "border-brand-purple" : "border-border"}`}
      style={{ backgroundColor: color }}
    />
  );
}
