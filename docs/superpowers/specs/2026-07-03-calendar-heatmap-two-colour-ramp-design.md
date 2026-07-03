# Calendar Heatmap — Two-Colour, 10-Shade Ramp

**Date:** 2026-07-03
**Status:** Approved design, pending implementation plan

## Context

The calendar heatmap currently derives its colour scale from a **single** picked
colour (`settings.color`, default `#85b8e8`). `getColorScale()` in
[`src/utils/colors.ts`](../../../src/utils/colors.ts) builds a **5-entry** scale
(`empty`, `low`, `medium-low`, `medium-high`, `high`) by interpolating in RGB
between a pale tint of that colour (`lightness(92).saturate(0.1)`) and a darkened
version (`darken(0.2).saturate(0.1)`).

Cells are coloured at render time by ECharts, via the `visualMap.pieces` in
[`src/settings.ts`](../../../src/settings.ts), which split the displayed year's
`max` into quarters (`0`, `≤25%`, `≤50%`, `≤75%`, `>75%`).

`getCellColor()` in `colors.ts` reimplements the same bucketing but is **dead
code** — nothing imports it; the live path is `visualMap`.

## Goal

Replace the single-colour, 5-shade scale with a **two-colour, 10-shade** ramp:

- The user picks **two** colours (Colour 1, Colour 2).
- **Shades 1–5** interpolate from a pale tint of Colour 1 up to Colour 1.
- **Shades 6–10** interpolate from Colour 1 across to Colour 2.
- Values map to 10 bands (deciles of the displayed year's max).

## Design

### 1. Settings — add `color2` ([`src/index.tsx`](../../../src/index.tsx), [`src/types.ts`](../../../src/types.ts))

- Add `color2?: string` to the `Settings` type.
- Add a second `color` widget in the **Display** section, `title: "Color 2"`.
  Relabel the existing setting `title: "Color 1"`.
- Defaults (o2o brand):
  - `color` (Colour 1) → `#0029D6` (Deep Blue).
  - `color2` (Colour 2) → `#86226F` (Purple).
- In `colors.ts`, keep the existing constant name `DEFAULT_CALENDAR_COLOR` but
  change its value to `#0029D6` (it is already imported by `index.tsx` and
  `Visualization.tsx`), and add `DEFAULT_CALENDAR_COLOR_2 = "#86226F"`.

Backwards compatibility: existing saved charts only have `color`. `color2` is
absent and falls back to its default, so nothing breaks. Charts that customised
`color` keep their Colour 1; their Colour 2 becomes the new default.

### 2. `getColorScale(color1, color2)` → 10 shades ([`src/utils/colors.ts`](../../../src/utils/colors.ts))

- Change the return type from the named `ColorMap` record to a plain
  `string[]` of length 10 (define `type ColorScale = string[]` or use `string[]`
  directly). Remove the `ColorMap` type.
- Algorithm:
  - `paleStart = Color(color1).lightness(92).saturate(0.1)` — **unchanged** from
    today's pale end.
  - Shades 1–5: `lerpColor(paleStart, color1, t)` for `t ∈ {0, .25, .5, .75, 1}`
    → shade 5 lands exactly on Colour 1.
  - Shades 6–10: `lerpColor(color1, color2, t)` for `t ∈ {.2, .4, .6, .8, 1}`
    → shade 10 lands exactly on Colour 2; `t` starts at `.2` (not `0`) so
    Colour 1 is not duplicated between the two halves.
  - Return the concatenation (length 10).
- `lerpColor` and the `LIGHTNESS`/`SATURATE` constants are reused as-is. `DARKEN`
  is no longer needed (endpoints are user-defined) and is removed.

### 3. Value → shade in `visualMap.pieces` ([`src/settings.ts`](../../../src/settings.ts))

- `getOption` gains a `color2` parameter; it calls
  `getColorScale(color, color2)` and receives `shades: string[]`.
- Build `pieces` programmatically:
  - `{ min: 0, max: 0, color: shades[0] }` — value exactly 0 → shade 1.
  - For band `i` in `0..9`: values in `(i/10·max, (i+1)/10·max]` → `shades[i]`,
    with the top band (`i === 9`) open-ended (`{ gt: 0.9·max, color: shades[9] }`).
- `inRange.color` is set to the `shades` array (was the `ColorMap` object).
- Everything else in `getOption` (empty-cell series, labels, tooltip, calendar
  layout) is unchanged. Cells with **no data** still render flat grey via the
  separate `emptyData` series — that behaviour is untouched.

### 4. Wire the new setting through ([`src/Visualization.tsx`](../../../src/Visualization.tsx))

- Read `const color2 = settings.color2 ?? DEFAULT_CALENDAR_COLOR_2;`.
- Pass `color2` into `getOption(...)` and add it to the `useMemo` dependency
  array.

### 5. Cleanup

- **Delete** the unused `getCellColor()` function and the `ColorMap` type from
  `colors.ts`. It duplicates the bucketing logic and would silently drift from
  the `visualMap.pieces`. The live rendering path does not use it.

## Default ramp (computed via the `color` library)

Colour 1 `#0029D6` → Colour 2 `#86226F`:

| Shade | Hex       | Value band             |
| ----: | --------- | ---------------------- |
|     1 | `#D6DEFF` | `0` and `0–10%` of max |
|     2 | `#A1B1F5` | `10–20%`               |
|     3 | `#6B84EB` | `20–30%`               |
|     4 | `#3656E0` | `30–40%`               |
|     5 | `#0029D6` | `40–50%` (= Colour 1)  |
|     6 | `#1B28C1` | `50–60%`               |
|     7 | `#3626AD` | `60–70%`               |
|     8 | `#502598` | `70–80%`               |
|     9 | `#6B2384` | `80–90%`               |
|    10 | `#86226F` | `90–100%` (= Colour 2) |

Known trade-off: Deep Blue and Purple are close in lightness, so the upper half
reads as "blue darkening" until shades 9–10. This is accepted; users can pick a
brighter Colour 2 per chart if they want an earlier hue shift.

## Files touched

- `src/types.ts` — add `color2` to `Settings`.
- `src/utils/colors.ts` — new `getColorScale` signature + 10-shade logic;
  add `DEFAULT_CALENDAR_COLOR_2`; remove `getCellColor` and `ColorMap`.
- `src/index.tsx` — add `color2` setting, relabel Colour 1, new defaults.
- `src/settings.ts` — `getOption` takes `color2`; generate 10-band `pieces`.
- `src/Visualization.tsx` — read + pass `color2`.

## Verification

- Type-check passes (`tsc`), matching the existing `type-check` workflow.
- Prettier clean, matching the existing `prettier` workflow.
- Manual: with default data, cells span the 10-shade blue→purple ramp; the
  `visualMap` legend renders; an existing chart with only `color` saved still
  renders (Colour 2 defaults in). Verified against the computed shade table.

## Out of scope

- Configurable number of shades (fixed at 10).
- A third colour / diverging scales.
- Changing the "no data" grey or the relative-to-max bucketing model.
- Absolute (cross-year) value scaling.
