import Color from "color";

export const TEXT_COLOR = "#57606a";
export const TEXT_COLOR_DARK = "#c9d1d9";

/**
 * o2o brand-derived categorical palette. Seeded with the o2o blue and
 * magenta used by the calendar-heatmap, then extended with complementary
 * hues. Finetune against the o2o-brand palette later.
 */
export const O2O_CATEGORICAL: string[] = [
  "#0029D6", // o2o blue
  "#86226F", // o2o magenta
  "#00A5A5",
  "#F2A900",
  "#D6002B",
  "#5B8C00",
  "#7B61FF",
  "#E8730C",
];

/** Deterministic fallback color for categories beyond the palette length. */
export function generateColor(i: number): string {
  const hue = (i * 137.508) % 360; // golden angle keeps hues spread out
  return Color.hsl(hue, 60, 55).string();
}

/** One stable color per category, aligned to the input order. */
export function getCategoryColors(categories: string[]): string[] {
  return categories.map((_, i) =>
    i < O2O_CATEGORICAL.length ? O2O_CATEGORICAL[i] : generateColor(i),
  );
}
