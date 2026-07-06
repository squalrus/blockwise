// Marker color per venue category group (README §1.7, §2's 6 groups). Fixed
// slot order from the validated categorical palette -- never cycled, so a
// group's color stays stable as other groups are added/removed. Light/dark
// steps and ordering validated with the dataviz skill's palette validator
// (worst adjacent CVD ΔE 24.2 light / 10.3 dark; light-mode aqua & yellow and
// dark-mode green/orange pairs fall under the palette's documented relief
// rule, mitigated here by the always-visible legend + info-window text
// rather than color alone).
export type ColorMode = "light" | "dark";

const CATEGORY_GROUP_COLORS: Record<string, { light: string; dark: string }> = {
  "Food & Drink": { light: "#2a78d6", dark: "#3987e5" },
  Retail: { light: "#1baf7a", dark: "#199e70" },
  "Health & Wellness": { light: "#eda100", dark: "#c98500" },
  Services: { light: "#008300", dark: "#008300" },
  "Arts, Culture & Recreation": { light: "#4a3aa7", dark: "#9085e9" },
  Lodging: { light: "#e34948", dark: "#e66767" },
};

// Muted ink -- for venues with no resolved category group.
const FALLBACK_COLOR = { light: "#898781", dark: "#898781" };

export function getCategoryColor(categoryGroup: string | null, mode: ColorMode): string {
  const entry = (categoryGroup && CATEGORY_GROUP_COLORS[categoryGroup]) || FALLBACK_COLOR;
  return entry[mode];
}

export function getCategoryLegend(mode: ColorMode): { name: string; color: string }[] {
  return Object.entries(CATEGORY_GROUP_COLORS).map(([name, colors]) => ({
    name,
    color: colors[mode],
  }));
}
