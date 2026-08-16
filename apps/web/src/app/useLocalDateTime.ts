import { useEffect, useState } from "react";

// Formats a UTC timestamp using the viewer's own locale/timezone. Doing that
// during the initial render is a hydration hazard: Next.js server-renders
// "use client" components too, and the server's timezone/locale can disagree
// with the browser's, so any timestamp near a local day boundary would
// server-render one value and hydrate to another (React error #418). This
// hook instead returns null on the first (server-matching) render and fills
// in the real value from an effect once mounted -- callers render a stable
// placeholder for the null case, then the real formatted text appears right
// after hydration.
//
// `format` should be a stable, module-level function (like the existing
// formatEventDate/formatEventTime helpers) rather than an inline arrow --
// it's intentionally left out of the effect's deps below so a fresh closure
// each render doesn't re-trigger the effect.
//
// `isoString` is omittable for callers formatting "now" rather than a fixed
// timestamp (e.g. today's weekday name) -- the effect still only fires once,
// on mount, computing that "now" client-side instead of at SSR time.
export function useLocalDateTime<T>(isoString: string | undefined, format: (date: Date) => T): T | null {
  const [formatted, setFormatted] = useState<T | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormatted(format(isoString !== undefined ? new Date(isoString) : new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `format` is expected to be a stable module-level function, not re-created per render
  }, [isoString]);

  return formatted;
}
