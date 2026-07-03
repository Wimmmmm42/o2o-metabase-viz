# Two-Colour, 10-Shade Calendar Heatmap Ramp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the calendar heatmap's single-colour, 5-shade scale with a two-colour, 10-shade ramp (shades 1–5: pale tint of Colour 1 → Colour 1; shades 6–10: Colour 1 → Colour 2), mapping values to 10 bands.

**Architecture:** A new `color2` setting flows from the Metabase Display panel through `Visualization.tsx` into `getOption`. `getColorScale(color1, color2)` builds a 10-entry `string[]` ramp by RGB-interpolating in two halves. ECharts colours cells at render time via `visualMap.pieces`, now 10 bands (deciles of the displayed year's `max`) plus a zero piece. The dead `getCellColor`/`ColorMap` are removed.

**Tech Stack:** TypeScript, React 18, ECharts 6, the `color` library, Vite. No test framework in this repo — verification is `tsc --noEmit`, `vite build`, Prettier, plus a throwaway Node assertion script (run via `--experimental-strip-types`) that pins the exact ramp hexes.

**Spec:** `docs/superpowers/specs/2026-07-03-calendar-heatmap-two-colour-ramp-design.md`

---

## File Structure

| File | Change |
|------|--------|
| `src/types.ts` | Add `color2?: string` to `Settings`. |
| `src/utils/colors.ts` | New `getColorScale(color1, color2): string[]`; add `DEFAULT_CALENDAR_COLOR_2`; change `DEFAULT_CALENDAR_COLOR` value; remove `getCellColor`, `ColorMap`, `DARKEN`; add `ColorScale` type. |
| `src/index.tsx` | Add `color2` Display setting; relabel existing to "Color 1". |
| `src/settings.ts` | `getOption` gains a `color2` param; generate 10-band `pieces`; `inRange.color` becomes the ramp array. |
| `src/Visualization.tsx` | Read `settings.color2` (default fallback) and pass it to `getOption`. |

**Commit strategy (every commit type-checks green):** Tasks 1–3 are additive and safe on their own. Task 4 changes `getColorScale`'s return shape, which simultaneously breaks `settings.ts` (it indexes the old object) and `Visualization.tsx` (new required param) — so those three files change in **one** commit to keep `tsc` green.

---

## Task 0: Setup — install dependencies

**Files:** none (branch `feat/two-colour-heatmap-ramp` is already checked out with the spec committed).

- [ ] **Step 1: Confirm branch**

Run: `git branch --show-current`
Expected: `feat/two-colour-heatmap-ramp`

- [ ] **Step 2: Install dependencies**

Run: `npm ci`
Expected: installs cleanly, `node_modules/` created (needed for `tsc`, `vite build`, and the `color` import in the verification script).

- [ ] **Step 3: Baseline type-check**

Run: `npm run type-check`
Expected: PASS (no errors) — confirms a clean starting point.

---

## Task 1: Add `color2` to the Settings type

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add the optional field**

In `src/types.ts`, change the `Settings` type to add `color2`:

```ts
export type Settings = {
  dimension?: string;
  metric?: string;
  color?: string;
  color2?: string;
  cellShape?: CellShape;
};
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS (additive optional field, nothing else affected).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "$(cat <<'EOF'
feat: add optional color2 to heatmap Settings

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update colour default constants

**Files:**
- Modify: `src/utils/colors.ts` (constants only — `getColorScale`/`getCellColor` are rewritten in Task 4)

- [ ] **Step 1: Change the default and add the second default**

In `src/utils/colors.ts`, replace the `DEFAULT_CALENDAR_COLOR` line and add `DEFAULT_CALENDAR_COLOR_2` directly beneath it. Before:

```ts
export const DEFAULT_CALENDAR_COLOR = "#85b8e8";
```

After:

```ts
export const DEFAULT_CALENDAR_COLOR = "#0029D6";
export const DEFAULT_CALENDAR_COLOR_2 = "#86226F";
```

Leave `TEXT_COLOR`, `TEXT_COLOR_DARK`, `EMPTY_CELL_COLOR`, `EMPTY_CELL_COLOR_DARK`, and every function unchanged in this task.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS (`getColorScale` still returns `ColorMap`; only literals changed).

- [ ] **Step 3: Commit**

```bash
git add src/utils/colors.ts
git commit -m "$(cat <<'EOF'
feat: default heatmap colours to o2o deep blue and purple

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Expose the `color2` setting in the Display panel

**Files:**
- Modify: `src/index.tsx`

- [ ] **Step 1: Import the second default**

In `src/index.tsx`, update the import from `./utils/colors` (currently `import { DEFAULT_CALENDAR_COLOR } from "./utils/colors";`):

```ts
import {
  DEFAULT_CALENDAR_COLOR,
  DEFAULT_CALENDAR_COLOR_2,
} from "./utils/colors";
```

- [ ] **Step 2: Relabel the existing colour setting and add `color2`**

In the `settings` object, replace the existing `color` setting block with the following two blocks (relabels the first to "Color 1", adds "Color 2" right after):

```ts
      color: defineSetting({
        id: "color",
        getSection: () => "Display",
        title: "Color 1",
        widget: "color",
        getDefault: () => DEFAULT_CALENDAR_COLOR,
        getProps: () => ({}),
      }),
      color2: defineSetting({
        id: "color2",
        getSection: () => "Display",
        title: "Color 2",
        widget: "color",
        getDefault: () => DEFAULT_CALENDAR_COLOR_2,
        getProps: () => ({}),
      }),
```

Leave the `cellShape` setting after these, unchanged.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS (`Settings.color2` exists from Task 1; `DEFAULT_CALENDAR_COLOR_2` exists from Task 2).

- [ ] **Step 4: Commit**

```bash
git add src/index.tsx
git commit -m "$(cat <<'EOF'
feat: add Color 2 picker to heatmap Display settings

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 10-shade ramp — `getColorScale`, `getOption` pieces, and wiring

This is the core change. `getColorScale`'s return type changes from `ColorMap` to `string[]`, which forces `settings.ts` and `Visualization.tsx` to change in the same commit so `tsc` stays green. TDD-style: write the ramp assertion first, watch it fail, implement, watch it pass.

**Files:**
- Create (temporary, NOT committed): `verify-color-scale.mjs`
- Modify: `src/utils/colors.ts`
- Modify: `src/settings.ts`
- Modify: `src/Visualization.tsx`

- [ ] **Step 1: Write the failing verification script**

Create `verify-color-scale.mjs` at the repo root with exactly this content:

```js
import { getColorScale } from "./src/utils/colors.ts";
import Color from "color";
import assert from "node:assert/strict";

const EXPECTED = [
  "#D6DEFF",
  "#A1B1F5",
  "#6B84EB",
  "#3656E0",
  "#0029D6",
  "#1B28C1",
  "#3626AD",
  "#502598",
  "#6B2384",
  "#86226F",
];

const shades = getColorScale("#0029D6", "#86226F");
const hex = shades.map((s) => Color(s).hex());
console.log(hex);
assert.equal(shades.length, 10, "expected 10 shades");
assert.deepEqual(hex, EXPECTED, "shade hex values must match the spec table");
console.log("PASS: 10-shade ramp matches the spec table");
```

- [ ] **Step 2: Run it and verify it FAILS**

Run: `node --experimental-strip-types verify-color-scale.mjs`
Expected: FAIL — a `TypeError: shades.map is not a function`, because the current `getColorScale` ignores the second argument and returns the `ColorMap` object (not an array). This confirms the test exercises the not-yet-implemented behaviour.

- [ ] **Step 3: Rewrite `src/utils/colors.ts`**

Replace the entire contents of `src/utils/colors.ts` with:

```ts
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
```

This removes `ColorMap`, `getCellColor`, and the `DARKEN` constant, and adds `ColorScale`. `EMPTY_CELL_COLOR`/`EMPTY_CELL_COLOR_DARK` stay because `settings.ts` still uses them for the no-data series.

- [ ] **Step 4: Update `getOption` in `src/settings.ts` — signature**

Add a `color2: string` parameter immediately after `color`:

```ts
export const getOption = (
  data: Array<[DateString, Value]>,
  displayedYear: number,
  color: string,
  color2: string,
  colorScheme: "light" | "dark" | undefined,
  cellSize: number,
  cellShape: CellShape | undefined,
  dimensionCol: Column,
  metricCol: Column,
): echarts.EChartsCoreOption => {
```

- [ ] **Step 5: Update `getOption` — build the ramp and pieces**

Replace this line near the top of the function body:

```ts
  const colorScale = getColorScale(color);
```

with:

```ts
  const shades = getColorScale(color, color2);
```

Then, immediately after the `const borderRadius = getBorderRadius(cellShape, cellSize);` line (just before the `return {`), add the piece builder:

```ts
  type Piece = {
    min?: number;
    max?: number;
    gt?: number;
    lte?: number;
    color: string;
  };
  const pieces: Piece[] = [
    { min: 0, max: 0, color: shades[0] },
    ...shades.map((color, i): Piece => {
      const lower = (max * i) / 10;
      return i === shades.length - 1
        ? { gt: lower, color }
        : { gt: lower, lte: (max * (i + 1)) / 10, color };
    }),
  ];
```

- [ ] **Step 6: Update `getOption` — use `shades` and `pieces` in `visualMap`**

In the returned `visualMap` object, replace the `inRange` and `pieces` fields. Before:

```ts
      inRange: {
        color: colorScale,
      },
      pieces: [
        { min: 0, max: 0, color: colorScale["empty"] },
        { gt: 0, lte: max * 0.25, color: colorScale["low"] },
        {
          gt: max * 0.25,
          lte: max * 0.5,
          color: colorScale["medium-low"],
        },
        {
          gt: max * 0.5,
          lte: max * 0.75,
          color: colorScale["medium-high"],
        },
        { gt: max * 0.75, color: colorScale["high"] },
      ],
```

After:

```ts
      inRange: {
        color: shades,
      },
      pieces,
```

Leave everything else in `visualMap` (min, max, top, formatter, text, etc.), the `calendar` block, and both `series` unchanged.

- [ ] **Step 7: Update `src/Visualization.tsx`**

First, extend the import from `./utils/colors` (currently `import { DEFAULT_CALENDAR_COLOR } from "./utils/colors";`):

```ts
import {
  DEFAULT_CALENDAR_COLOR,
  DEFAULT_CALENDAR_COLOR_2,
} from "./utils/colors";
```

Next, just after the line `const color = settings.color ?? DEFAULT_CALENDAR_COLOR;`, add:

```ts
  const color2 = settings.color2 ?? DEFAULT_CALENDAR_COLOR_2;
```

Then update the `getOption` call inside `useMemo` to pass `color2` after `color`:

```ts
  const option = useMemo(() => {
    return getOption(
      data,
      currentYear,
      color,
      color2,
      colorScheme,
      cellSize,
      cellShape,
      dimensionCol,
      metricCol,
    );
  }, [
    data,
    currentYear,
    color,
    color2,
    colorScheme,
    cellSize,
    cellShape,
    dimensionCol,
    metricCol,
  ]);
```

- [ ] **Step 8: Run the verification script — expect PASS**

Run: `node --experimental-strip-types verify-color-scale.mjs`
Expected: prints the 10 hex values and `PASS: 10-shade ramp matches the spec table` (exit code 0).

- [ ] **Step 9: Type-check**

Run: `npm run type-check`
Expected: PASS (all three files now agree on the `string[]` ramp and the new `getOption` arity).

- [ ] **Step 10: Build**

Run: `npm run build`
Expected: `vite build` succeeds and `node pack.mjs` completes with no errors.

- [ ] **Step 11: Format**

Run: `npm run prettier`
Expected: writes any formatting; `git status` should show only the files you changed (plus docs). This mirrors the CI check (`prettier` then `git diff --exit-code`).

- [ ] **Step 12: Remove the temporary verification script**

Run: `rm verify-color-scale.mjs`
(The ramp is now locked by the spec table and `tsc`; the script is a one-shot check and must not be committed.)

- [ ] **Step 13: Commit the three source files**

```bash
git add src/utils/colors.ts src/settings.ts src/Visualization.tsx
git commit -m "$(cat <<'EOF'
feat: 10-shade two-colour heatmap ramp

Build the colour scale from two picked colours (shades 1-5 pale
tint of Colour 1 -> Colour 1; shades 6-10 Colour 1 -> Colour 2) and
map values to 10 decile bands via visualMap. Remove the unused
getCellColor/ColorMap.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 14: Confirm a clean tree**

Run: `git status`
Expected: `nothing to commit, working tree clean` (no stray `verify-color-scale.mjs`).

---

## Task 5: Final verification

**Files:** none.

- [ ] **Step 1: Full type-check + build from a clean state**

Run: `npm run type-check && npm run build`
Expected: both PASS.

- [ ] **Step 2: Prettier check (as CI runs it)**

Run: `npm run prettier && git diff --exit-code`
Expected: exit code 0 (no unformatted changes).

- [ ] **Step 3: Manual visual sanity check**

The ramp's exact appearance was pre-approved via the artifact preview and is pinned by the Task 4 assertion. Because this is a Metabase-hosted custom viz (it needs the host to supply `series`/`settings`), there is no standalone local render. Confirm instead that:
- The Display panel now shows **Color 1** and **Color 2** pickers (from `src/index.tsx`).
- The committed default hexes match the spec table shade 1 (`#D6DEFF`) → shade 10 (`#86226F`).

If deploying to a Metabase instance for a live check, load a card with a date dimension + numeric metric and confirm cells span pale blue → deep blue → purple, and that a previously-saved card (with only `color` set) still renders with the new default Colour 2.

---

## Self-Review (completed by plan author)

- **Spec coverage:** `color2` setting (Task 1 type + Task 3 UI), `getColorScale` 10-shade rewrite (Task 4.3), 10-band `visualMap` + zero piece (Task 4.5–4.6), wiring through `Visualization.tsx` (Task 4.7), default constants incl. `#0029D6`/`#86226F` (Task 2), dead-code removal of `getCellColor`/`ColorMap`/`DARKEN` (Task 4.3), backwards-compat via `?? DEFAULT_CALENDAR_COLOR_2` (Task 4.7). All spec sections mapped.
- **Placeholder scan:** none — every code/edit step shows full content; every run step gives an exact command and expected result.
- **Type consistency:** `getColorScale(color1, color2): ColorScale` (= `string[]`) used identically in `settings.ts` (`getColorScale(color, color2)`); `getOption` param order (`color, color2, colorScheme, …`) matches the call in `Visualization.tsx`; `shades`/`pieces`/`Piece` names consistent within `settings.ts`; `DEFAULT_CALENDAR_COLOR_2` defined in Task 2 and consumed in Tasks 3 and 4.7.
