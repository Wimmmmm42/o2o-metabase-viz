import Color from "color";

export const TEXT_COLOR = "#57606a";
export const TEXT_COLOR_DARK = "#c9d1d9";
export const DEFAULT_CALENDAR_COLOR = "#0029D6";
export const DEFAULT_CALENDAR_COLOR_2 = "#86226F";
export const EMPTY_CELL_COLOR = "#ebedf0";
export const EMPTY_CELL_COLOR_DARK = "#21262d";

/** A colour ramp, palest first (length 10). */
export type ColorScale = string[];

/** Linear interpolate between two colors (t: 0 = from, 1 = to) */
function lerpColor(from: string, to: string, t: number): string {
  const a = Color(from).rgb().array();
  const b = Color(to).rgb().array();
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return Color.rgb(r, g, bl).string();
}

const LIGHTNESS = 92;
const SATURATE = 0.1;

/**
 * Build a 10-shade ramp from two colours:
 * shades 1-5 interpolate from a pale tint of color1 up to color1,
 * shades 6-10 interpolate from color1 across to color2.
 * The second half starts at t=0.2 so color1 is not duplicated.
 */
export function getColorScale(color1: string, color2: string): ColorScale {
  const paleStart = Color(color1)
    .lightness(LIGHTNESS)
    .saturate(SATURATE)
    .string();
  const firstHalf = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    lerpColor(paleStart, color1, t),
  );
  const secondHalf = [0.2, 0.4, 0.6, 0.8, 1].map((t) =>
    lerpColor(color1, color2, t),
  );
  return [...firstHalf, ...secondHalf];
}
