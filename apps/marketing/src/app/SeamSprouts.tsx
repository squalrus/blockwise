"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MushroomMark } from "@blockwise/ui";
import type { MushroomShape, SpotShape } from "@blockwise/ui";

// Same fixed hex palette as page.tsx/brand/page.tsx, minus Cocoa (an ink cap
// would vanish against the ink ground these sprout from).
const CAPS = ["#E8542A", "#F2A93B", "#4C8C4A", "#8B5FBF", "#4A5FA5", "#B33A3A", "#D98A9C"];
const SHAPES: MushroomShape[] = [
  "button",
  "parasol",
  "bell",
  "chanterelle",
  "morel",
  "enoki",
  "porcini",
  "oyster",
  "puffball",
  "shiitake",
];
const SPOT_SHAPES: SpotShape[] = ["circle", "ring", "sparks", "star", "triangle", "cross"];

type Sprout = {
  x: number;
  depth: number;
  size: number;
  shape: MushroomShape;
  cap: string;
  spotShape: SpotShape;
  spotCount: number;
  delay: number;
};

// Deterministic (mulberry32) rather than Math.random() -- this page is
// statically prerendered then hydrated, so per-mushroom randomness has to
// match exactly between server and client or React throws a hydration
// mismatch. Same `seed` always produces the same sprouts.
function mulberry32(seed: number) {
  let s = seed | 0;
  return function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSprouts(seed: number, count: number): Sprout[] {
  const rand = mulberry32(seed);
  const bandWidth = 100 / count;
  const sprouts: Sprout[] = [];
  for (let i = 0; i < count; i++) {
    const shape = SHAPES[Math.floor(rand() * SHAPES.length)];
    // Chanterelle/enoki caps have no room for more than 3 spots (see
    // packages/ui/src/MushroomMark.tsx).
    const maxSpots = shape === "chanterelle" || shape === "enoki" ? 3 : 6;
    sprouts.push({
      x: i * bandWidth + bandWidth * 0.15 + rand() * bandWidth * 0.7,
      // Small jitter only -- these stay anchored right at the seam line so
      // they read as growing out of the ground at the boundary, not
      // scattered through the section below it.
      depth: rand() * 14,
      size: 14 + rand() * 22,
      shape,
      cap: CAPS[Math.floor(rand() * CAPS.length)],
      spotShape: SPOT_SHAPES[Math.floor(rand() * SPOT_SHAPES.length)],
      spotCount: 1 + Math.floor(rand() * maxSpots),
      // Staggers the growth so the band visibly sprouts one-by-one rather
      // than all at once when it scrolls into view.
      delay: Math.floor(rand() * 600),
    });
  }
  return sprouts;
}

// A band of mushrooms sprouting up out of the ground (a brown/ink section)
// into the lighter section above it as the band scrolls into view -- staying
// anchored at the seam line, each growing in with its own delay so more
// visibly sprout the longer the band is in view, then holding still (no idle
// bob after). Only meant to sit on seams where the section *below* is brown
// -- placed as a sibling between that section and the one above it, not
// nested in either, so it isn't clipped by either section's own
// overflow-hidden.
export function SeamSprouts({ seed, count = 7 }: { seed: number; count?: number }) {
  const sprouts = useMemo(() => generateSprouts(seed, count), [seed, count]);
  const [revealed, setRevealed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- can't know the client's motion preference during SSR; deliberately deferred past hydration, same pattern as apps/web/src/app/ThemeToggle.tsx
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative z-10 h-0 overflow-visible" aria-hidden="true">
      {sprouts.map((s, i) => (
        // Outer: static ground position -- never animated, so it can never
        // be clobbered by the inner element's one-shot grow transform.
        <div key={i} className="absolute" style={{ left: `${s.x}%`, top: `${s.depth}px`, transform: "translateY(-60%)" }}>
          <div
            className={revealed ? "seam-sprout-grow" : "seam-sprout-hidden"}
            style={revealed ? { animationDelay: `${s.delay}ms` } : undefined}
          >
            <MushroomMark size={s.size} shape={s.shape} cap={s.cap} spotShape={s.spotShape} spotCount={s.spotCount} />
          </div>
        </div>
      ))}
    </div>
  );
}
