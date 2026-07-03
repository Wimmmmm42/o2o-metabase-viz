# Bar Race custom viz — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `@o2o/viz-bar-race` package to the monorepo — an animated horizontal bar-chart race driven by long-format query data (frame · category · value).

**Architecture:** Copy the `packages/calendar-heatmap` skeleton, then replace its logic. Rendering uses ECharts with `realtimeSort: true` (the mechanism from the ECharts `bar-race` example), but frames come from the query instead of random numbers. A React-owned `setInterval` advances a frame index and imperatively calls `chart.setOption({ series: [...] })` each tick so the bar re-sort animates smoothly; React state is used only for the lightweight overlay label and the play/pause button. Shared helpers (`isa`, `Button`, `useLatest`) are **copied** for this v1; `@o2o/viz-shared` extraction is a later follow-up.

**Tech Stack:** TypeScript, React 18, ECharts 6, `@metabase/custom-viz` SDK, Vite, npm workspaces.

**Spec:** [docs/superpowers/specs/2026-07-03-bar-race-viz-design.md](../specs/2026-07-03-bar-race-viz-design.md)

### Verification approach (read before starting)

This repo has **no unit-test harness**, and the approved spec verifies via type-check + build + manual dev-server checks (a bar race is a DOM/ECharts render, not meaningfully unit-testable without a heavy jsdom+canvas setup). So this plan deviates from default TDD: instead of "write failing test first," each task's verification step runs `npm run type-check` (and `npm run build` at integration points) from the package directory, and the final task documents a manual dev-server checklist. Keep type-check green at **every** commit.

### Commit convention

Every commit message must end with this trailer (append it to each `git commit` in this plan):

```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

All commands below assume the repo root is
`/Users/wimmmmm/Documents/GitHub Wimmmmm42 o2o/custom-viz-calendar-heatmap`
and are run from there unless a step says otherwise.

---

## File Structure

```
packages/bar-race/
├── package.json            # @o2o/viz-bar-race
├── tsconfig.json           # extends ../../tsconfig.base.json (copied as-is)
├── vite.config.ts          # copied unchanged (paths resolve from __dirname)
├── pack.mjs                # copied unchanged (paths resolve from import.meta.url)
├── metabase-plugin.json    # { name: "Bar Race", icon: "bar-race.svg", metabase: {...} }
├── README.md               # bar-race specifics
├── public/assets/
│   └── bar-race.svg        # plugin icon (3 bars)
└── src/
    ├── index.tsx           # defineConfig: id, sizing, checkRenderable, settings map
    ├── Visualization.tsx   # echarts init + frame timer + play/pause + overlay + click/hover
    ├── settings.ts         # getOption() + toSeriesData()
    ├── types.ts            # Settings, WhenFinished
    ├── utils/
    │   ├── data.ts         # getRaceData(), RaceData, rowKey(), compareFrames()
    │   ├── colors.ts       # O2O_CATEGORICAL, getCategoryColors(), generateColor(), text colors
    │   └── isa.ts          # column predicates + default column finders
    ├── components/Button.tsx   # copied unchanged
    └── hooks/useLatest.ts      # copied unchanged
```

Deleted from the copied skeleton (not needed): `src/components/CellShapeWidget.tsx`, `src/utils/looks.ts`.

---

## Task 1: Scaffold the `bar-race` package

**Files:**
- Create (copy): `packages/bar-race/` from `packages/calendar-heatmap/`
- Modify: `packages/bar-race/package.json`
- Modify: `packages/bar-race/metabase-plugin.json`
- Create: `packages/bar-race/public/assets/bar-race.svg`
- Delete: `packages/bar-race/public/assets/calendar.svg`

- [ ] **Step 1: Copy the skeleton and remove build artifacts**

```bash
cp -R packages/calendar-heatmap packages/bar-race
rm -rf packages/bar-race/dist packages/bar-race/*.tgz packages/bar-race/node_modules
```

- [ ] **Step 2: Rename the package**

Replace the entire contents of `packages/bar-race/package.json` with:

```json
{
  "name": "@o2o/viz-bar-race",
  "version": "1.0.0",
  "private": true,
  "license": "MIT",
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "build": "vite build && node pack.mjs",
    "dev": "vite build --watch & vite preview",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/tar-stream": "3.1.4",
    "@vitejs/plugin-react": "5.2.0",
    "tar-stream": "3.1.8",
    "typescript": "^6.0.2",
    "vite": "^8.0.8"
  },
  "dependencies": {
    "@metabase/custom-viz": "^1.0.4",
    "color": "^5.0.3",
    "echarts": "^6.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

- [ ] **Step 3: Set the plugin manifest**

Replace the entire contents of `packages/bar-race/metabase-plugin.json` with:

```json
{
  "name": "Bar Race",
  "icon": "bar-race.svg",
  "metabase": {
    "version": ">=1.62.0"
  }
}
```

- [ ] **Step 4: Add the icon and remove the calendar icon**

Create `packages/bar-race/public/assets/bar-race.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <rect x="3" y="4" width="14" height="4" rx="1" />
  <rect x="3" y="10" width="18" height="4" rx="1" />
  <rect x="3" y="16" width="9" height="4" rx="1" />
</svg>
```

```bash
rm packages/bar-race/public/assets/calendar.svg
```

- [ ] **Step 5: Link the workspace and verify build**

```bash
npm install
npm run type-check -w @o2o/viz-bar-race
npm run build -w @o2o/viz-bar-race
```

Expected: type-check passes (the package is still internally the heatmap, which is fine at this point); build prints `Packed .../packages/bar-race/Bar Race-1.0.0.tgz`.

- [ ] **Step 6: Commit**

```bash
git add packages/bar-race package-lock.json
git commit -m "feat(bar-race): scaffold package from calendar-heatmap skeleton"
```

---

## Task 2: Core static bar race (data, colors, option, minimal render)

Replaces the copied heatmap logic with a bar race that renders the **first frame** as static sorted bars. No animation yet. This is the largest task because the SDK types the settings map as `Record<keyof Settings, …>` — the `Settings` type, the settings map, and the component must move together to stay green.

**Files:**
- Create/replace: `packages/bar-race/src/types.ts`
- Replace: `packages/bar-race/src/utils/isa.ts`
- Replace: `packages/bar-race/src/utils/colors.ts`
- Replace: `packages/bar-race/src/utils/data.ts`
- Replace: `packages/bar-race/src/settings.ts`
- Replace: `packages/bar-race/src/index.tsx`
- Replace: `packages/bar-race/src/Visualization.tsx`
- Delete: `packages/bar-race/src/components/CellShapeWidget.tsx`
- Delete: `packages/bar-race/src/utils/looks.ts`

- [ ] **Step 1: Delete the unused files**

```bash
rm packages/bar-race/src/components/CellShapeWidget.tsx packages/bar-race/src/utils/looks.ts
```

- [ ] **Step 2: Write `src/types.ts`**

```ts
export type WhenFinished = "loop" | "hold";

export type Settings = {
  frame?: string;
  category?: string;
  value?: string;
};
```

(More setting keys are added in later tasks, alongside their setting definitions, to keep `Record<keyof Settings, …>` satisfied.)

- [ ] **Step 3: Write `src/utils/isa.ts`**

```ts
import {
  Column,
  isCategory,
  isDate,
  isNumeric,
  isString,
} from "@metabase/custom-viz";

/** Value bars: numeric, but not a date (isDate/isNumeric are not exclusive). */
export function isValueCol(col: Column | null | undefined): boolean {
  return isNumeric(col) && !isDate(col);
}

/** Category bars: string-like / categorical. */
export function isCategoryCol(col: Column | null | undefined): boolean {
  return isString(col) || isCategory(col);
}

/** Frame axis: prefer a temporal column, else any non-value dimension. */
export function findDefaultFrameName(cols: Column[]): string | undefined {
  return (cols.find(isDate) ?? cols.find((c) => !isValueCol(c)))?.name;
}

export function findDefaultCategoryName(
  cols: Column[],
  frameName: string | undefined,
): string | undefined {
  return (
    cols.find((c) => c.name !== frameName && isCategoryCol(c))?.name ??
    cols.find((c) => c.name !== frameName)?.name
  );
}

export function findDefaultValueName(cols: Column[]): string | undefined {
  return cols.find(isValueCol)?.name;
}
```

- [ ] **Step 4: Write `src/utils/colors.ts`**

```ts
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
```

- [ ] **Step 5: Write `src/utils/data.ts`**

```ts
import { Column, isDate, Series } from "@metabase/custom-viz";
import { Settings } from "../types";
import { getCategoryColors } from "./colors";

export type RaceData = {
  /** Distinct frame values, sorted ascending. */
  frames: string[];
  /** Stable list of all categories (first-appearance order). */
  categories: string[];
  /** valuesByFrame[frameIdx][categoryIdx], missing pairs filled with 0. */
  valuesByFrame: number[][];
  /** One color per category, aligned to `categories`. */
  colors: string[];
  frameCol: Column;
  categoryCol: Column;
  valueCol: Column;
  /** rowKey(frame, category) -> original row index, for drill-through. */
  rowLookup: Map<string, number>;
};

export function rowKey(frame: string, category: string): string {
  return `${frame} ${category}`;
}

function compareFrames(a: string, b: string, frameCol: Column): number {
  if (isDate(frameCol)) {
    return new Date(a).getTime() - new Date(b).getTime();
  }
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) {
    return na - nb;
  }
  return a.localeCompare(b);
}

export function getRaceData(series: Series, settings: Settings): RaceData {
  const [{ data }] = series;
  const frameIdx = data.cols.findIndex((c) => c.name === settings.frame);
  const catIdx = data.cols.findIndex((c) => c.name === settings.category);
  const valIdx = data.cols.findIndex((c) => c.name === settings.value);

  if (frameIdx === -1 || catIdx === -1 || valIdx === -1) {
    throw new Error("No valid columns to render a bar race");
  }

  const frameCol = data.cols[frameIdx];
  const categoryCol = data.cols[catIdx];
  const valueCol = data.cols[valIdx];

  const frameSet = new Set<string>();
  const categories: string[] = [];
  const catSeen = new Set<string>();
  // pairKey(frame,category) -> value, and -> original row index
  const valueByPair = new Map<string, number>();
  const rowLookup = new Map<string, number>();

  data.rows.forEach((row, rowIndex) => {
    const frame = String(row[frameIdx]);
    const category = String(row[catIdx]);
    const value = Number(row[valIdx]);
    frameSet.add(frame);
    if (!catSeen.has(category)) {
      catSeen.add(category);
      categories.push(category);
    }
    const key = rowKey(frame, category);
    valueByPair.set(key, value);
    rowLookup.set(key, rowIndex);
  });

  const frames = Array.from(frameSet).sort((a, b) =>
    compareFrames(a, b, frameCol),
  );

  const valuesByFrame = frames.map((frame) =>
    categories.map((category) => valueByPair.get(rowKey(frame, category)) ?? 0),
  );

  return {
    frames,
    categories,
    valuesByFrame,
    colors: getCategoryColors(categories),
    frameCol,
    categoryCol,
    valueCol,
    rowLookup,
  };
}
```

- [ ] **Step 6: Write `src/settings.ts`**

```ts
import type { Column } from "@metabase/custom-viz";
import { formatValue } from "@metabase/custom-viz";
import * as echarts from "echarts";
import { TEXT_COLOR, TEXT_COLOR_DARK } from "./utils/colors";

/** ECharts bar-series data items with per-category colors. */
export function toSeriesData(values: number[], colors: string[]) {
  return values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } }));
}

export function getOption(
  categories: string[],
  values: number[],
  colors: string[],
  barsShown: number,
  secondsPerFrame: number,
  colorScheme: "light" | "dark",
  valueCol: Column,
): echarts.EChartsCoreOption {
  const labelColor = colorScheme === "dark" ? TEXT_COLOR_DARK : TEXT_COLOR;
  const durationMs = Math.max(0, secondsPerFrame * 1000);
  return {
    backgroundColor: "transparent",
    grid: { top: 12, bottom: 24, left: 12, right: 90, containLabel: true },
    xAxis: {
      max: "dataMax",
      axisLabel: {
        color: labelColor,
        formatter: (n: number) => formatValue(n, { column: valueCol }),
      },
    },
    yAxis: {
      type: "category",
      data: categories,
      inverse: true,
      max: Math.max(0, barsShown - 1),
      animationDuration: 300,
      animationDurationUpdate: 300,
      axisLabel: { color: labelColor },
    },
    series: [
      {
        realtimeSort: true,
        type: "bar",
        data: toSeriesData(values, colors),
        label: {
          show: true,
          position: "right",
          valueAnimation: true,
          color: labelColor,
          formatter: (params: { value: number }) =>
            formatValue(params.value, { column: valueCol }),
        },
      },
    ],
    legend: { show: false },
    animationDuration: 0,
    animationDurationUpdate: durationMs,
    animationEasing: "linear",
    animationEasingUpdate: "linear",
  };
}
```

- [ ] **Step 7: Write `src/index.tsx`**

```tsx
import type { CreateCustomVisualization } from "@metabase/custom-viz";
import { defineConfig } from "@metabase/custom-viz";
import type { Settings } from "./types";
import { VisualizationComponent } from "./Visualization";
import {
  findDefaultCategoryName,
  findDefaultFrameName,
  findDefaultValueName,
  isCategoryCol,
  isValueCol,
} from "./utils/isa";

const createVisualization: CreateCustomVisualization<Settings> = ({
  defineSetting,
}) => {
  return defineConfig<Settings>({
    id: "bar-race",
    getName: () => "Bar Race",
    minSize: { width: 6, height: 4 },
    defaultSize: { width: 12, height: 8 },
    checkRenderable(series, settings) {
      if (series.length === 0) {
        throw new Error("No series provided");
      }
      const cols = series[0]?.data?.cols ?? [];
      const frameName = settings.frame ?? findDefaultFrameName(cols);
      const categoryName =
        settings.category ?? findDefaultCategoryName(cols, frameName);
      const valueName = settings.value ?? findDefaultValueName(cols);

      if (!frameName) {
        throw new Error("Please select a column for the frame (time) axis.");
      }
      if (!categoryName) {
        throw new Error("Please select a category column for the bars.");
      }
      if (!valueName) {
        throw new Error("Please select a numeric value column.");
      }

      const frameValues = new Set(
        (series[0]?.data?.rows ?? []).map((row) => {
          const idx = cols.findIndex((c) => c.name === frameName);
          return String(row[idx]);
        }),
      );
      if (frameValues.size < 2) {
        throw new Error(
          "The frame column needs at least 2 distinct values to animate.",
        );
      }
    },
    settings: {
      frame: defineSetting({
        id: "frame",
        getSection: () => "Data",
        title: "Frame column (time)",
        widget: "field",
        getDefault: (series) =>
          findDefaultFrameName(series?.[0]?.data?.cols ?? []),
        getProps: (series) => {
          const cols = series?.[0]?.data?.cols ?? [];
          return {
            columns: cols,
            options: cols.map(({ display_name, name }) => ({
              name: display_name,
              value: name,
            })),
          };
        },
      }),
      category: defineSetting({
        id: "category",
        getSection: () => "Data",
        title: "Category column",
        widget: "field",
        getDefault: (series, settings) =>
          findDefaultCategoryName(series?.[0]?.data?.cols ?? [], settings.frame),
        readDependencies: ["frame"],
        getProps: (series) => {
          const cols = (series?.[0]?.data?.cols ?? []).filter(isCategoryCol);
          return {
            columns: cols,
            options: cols.map(({ display_name, name }) => ({
              name: display_name,
              value: name,
            })),
          };
        },
      }),
      value: defineSetting({
        id: "value",
        getSection: () => "Data",
        title: "Value column",
        widget: "field",
        getDefault: (series) =>
          findDefaultValueName(series?.[0]?.data?.cols ?? []),
        getProps: (series) => {
          const cols = (series?.[0]?.data?.cols ?? []).filter(isValueCol);
          return {
            columns: cols,
            options: cols.map(({ display_name, name }) => ({
              name: display_name,
              value: name,
            })),
          };
        },
      }),
    },
    VisualizationComponent,
  });
};

export default createVisualization;
```

- [ ] **Step 8: Write `src/Visualization.tsx` (static first frame)**

```tsx
import type { CustomVisualizationProps } from "@metabase/custom-viz";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";
import { getOption } from "./settings";
import type { Settings } from "./types";
import { getRaceData } from "./utils/data";

export function VisualizationComponent({
  width,
  height,
  settings,
  series,
  colorScheme,
}: CustomVisualizationProps<Settings>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const raceData = useMemo(
    () => getRaceData(series, settings),
    [series, settings],
  );

  // init + dispose
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    return () => {
      chart.dispose();
      chartRef.current = null;
    };
  }, [colorScheme]);

  // apply the first frame's option
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const option = getOption(
      raceData.categories,
      raceData.valuesByFrame[0] ?? [],
      raceData.colors,
      10,
      3,
      colorScheme,
      raceData.valueCol,
    );
    chart.setOption(option, true);
  }, [raceData, colorScheme]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
```

- [ ] **Step 9: Verify type-check and build**

```bash
npm run type-check -w @o2o/viz-bar-race
npm run build -w @o2o/viz-bar-race
```

Expected: both pass; build repacks `Bar Race-1.0.0.tgz`.

- [ ] **Step 10: Commit**

```bash
git add packages/bar-race
git commit -m "feat(bar-race): static first-frame bar chart from long-format data"
```

---

## Task 3: Animate frames (autoplay) + bars-shown & seconds-per-frame settings

Adds the frame-advance timer and the two numeric Display settings that control it.

**Files:**
- Modify: `packages/bar-race/src/types.ts`
- Modify: `packages/bar-race/src/index.tsx`
- Modify: `packages/bar-race/src/Visualization.tsx`

- [ ] **Step 1: Extend `Settings` in `src/types.ts`**

Replace the `Settings` type with:

```ts
export type Settings = {
  frame?: string;
  category?: string;
  value?: string;
  barsShown?: number;
  secondsPerFrame?: number;
};
```

- [ ] **Step 2: Add the two settings to the map in `src/index.tsx`**

Inside the `settings: { … }` object, after the `value` setting, add:

```tsx
      barsShown: defineSetting({
        id: "barsShown",
        getSection: () => "Display",
        title: "Bars shown",
        widget: "number",
        getDefault: () => 10,
        getProps: () => ({ options: { isInteger: true, isNonNegative: true } }),
      }),
      secondsPerFrame: defineSetting({
        id: "secondsPerFrame",
        getSection: () => "Display",
        title: "Seconds per frame",
        widget: "number",
        getDefault: () => 3,
        getProps: () => ({ options: { isNonNegative: true } }),
      }),
```

- [ ] **Step 3: Drive the animation in `src/Visualization.tsx`**

Replace the entire file with:

```tsx
import type { CustomVisualizationProps } from "@metabase/custom-viz";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLatest } from "./hooks/useLatest";
import { getOption, toSeriesData } from "./settings";
import type { Settings } from "./types";
import { getRaceData } from "./utils/data";

export function VisualizationComponent({
  width,
  height,
  settings,
  series,
  colorScheme,
}: CustomVisualizationProps<Settings>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const frameIndexRef = useRef(0);

  const raceData = useMemo(
    () => getRaceData(series, settings),
    [series, settings],
  );
  const raceDataRef = useLatest(raceData);

  const barsShown = settings.barsShown ?? 10;
  const secondsPerFrame = settings.secondsPerFrame ?? 3;

  // init + dispose
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    return () => {
      chart.dispose();
      chartRef.current = null;
    };
  }, [colorScheme]);

  // (re)apply the base option whenever data/settings change; reset to frame 0
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    frameIndexRef.current = 0;
    chart.setOption(
      getOption(
        raceData.categories,
        raceData.valuesByFrame[0] ?? [],
        raceData.colors,
        barsShown,
        secondsPerFrame,
        colorScheme,
        raceData.valueCol,
      ),
      true,
    );
  }, [raceData, barsShown, secondsPerFrame, colorScheme]);

  // frame-advance timer (autoplay); loops for now (end-behavior added in Task 4)
  useEffect(() => {
    const frameCount = raceData.frames.length;
    if (frameCount < 2 || secondsPerFrame <= 0) return;
    const intervalMs = secondsPerFrame * 1000;
    const timer = setInterval(() => {
      const chart = chartRef.current;
      if (!chart) return;
      const next = (frameIndexRef.current + 1) % frameCount;
      frameIndexRef.current = next;
      chart.setOption({
        series: [
          {
            type: "bar",
            data: toSeriesData(
              raceDataRef.current.valuesByFrame[next],
              raceDataRef.current.colors,
            ),
          },
        ],
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [raceData, secondsPerFrame, raceDataRef]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [width, height]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
```

- [ ] **Step 4: Verify and commit**

```bash
npm run type-check -w @o2o/viz-bar-race
npm run build -w @o2o/viz-bar-race
git add packages/bar-race
git commit -m "feat(bar-race): autoplay frame animation with bars-shown and speed settings"
```

---

## Task 4: Play/pause control + when-finished (loop / hold) setting

**Files:**
- Modify: `packages/bar-race/src/types.ts`
- Modify: `packages/bar-race/src/index.tsx`
- Modify: `packages/bar-race/src/Visualization.tsx`

- [ ] **Step 1: Extend `Settings` in `src/types.ts`**

Replace the `Settings` type with (keep the `WhenFinished` type already at the top of the file):

```ts
export type Settings = {
  frame?: string;
  category?: string;
  value?: string;
  barsShown?: number;
  secondsPerFrame?: number;
  whenFinished?: WhenFinished;
};
```

- [ ] **Step 2: Add the `whenFinished` setting to `src/index.tsx`**

Add the `WhenFinished` import at the top:

```tsx
import type { Settings, WhenFinished } from "./types";
```

(Replace the existing `import type { Settings } from "./types";` line.)

Then, inside `settings: { … }` after `secondsPerFrame`, add:

```tsx
      whenFinished: defineSetting({
        id: "whenFinished",
        getSection: () => "Display",
        title: "When finished",
        widget: "segmentedControl",
        getDefault: (): WhenFinished => "loop",
        getProps: () => ({
          options: [
            { name: "Loop", value: "loop" },
            { name: "Hold at end", value: "hold" },
          ],
        }),
      }),
```

- [ ] **Step 3: Add play/pause + end-behavior to `src/Visualization.tsx`**

Replace the entire file with:

```tsx
import type { CustomVisualizationProps } from "@metabase/custom-viz";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./components/Button";
import { useLatest } from "./hooks/useLatest";
import { getOption, toSeriesData } from "./settings";
import type { Settings } from "./types";
import { getRaceData } from "./utils/data";

export function VisualizationComponent({
  width,
  height,
  settings,
  series,
  colorScheme,
}: CustomVisualizationProps<Settings>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const frameIndexRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const raceData = useMemo(
    () => getRaceData(series, settings),
    [series, settings],
  );
  const raceDataRef = useLatest(raceData);

  const barsShown = settings.barsShown ?? 10;
  const secondsPerFrame = settings.secondsPerFrame ?? 3;
  const whenFinished = settings.whenFinished ?? "loop";
  const whenFinishedRef = useLatest(whenFinished);

  const applyFrame = (index: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption({
      series: [
        {
          type: "bar",
          data: toSeriesData(
            raceDataRef.current.valuesByFrame[index],
            raceDataRef.current.colors,
          ),
        },
      ],
    });
  };

  // init + dispose
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    return () => {
      chart.dispose();
      chartRef.current = null;
    };
  }, [colorScheme]);

  // (re)apply the base option whenever data/settings change; reset to frame 0
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    frameIndexRef.current = 0;
    chart.setOption(
      getOption(
        raceData.categories,
        raceData.valuesByFrame[0] ?? [],
        raceData.colors,
        barsShown,
        secondsPerFrame,
        colorScheme,
        raceData.valueCol,
      ),
      true,
    );
    setIsPlaying(true);
  }, [raceData, barsShown, secondsPerFrame, colorScheme]);

  // frame-advance timer, honoring play/pause and the when-finished setting
  useEffect(() => {
    const frameCount = raceData.frames.length;
    if (!isPlaying || frameCount < 2 || secondsPerFrame <= 0) return;
    const intervalMs = secondsPerFrame * 1000;
    const timer = setInterval(() => {
      const atLast = frameIndexRef.current >= frameCount - 1;
      if (atLast) {
        if (whenFinishedRef.current === "hold") {
          setIsPlaying(false);
          return;
        }
        frameIndexRef.current = 0;
      } else {
        frameIndexRef.current += 1;
      }
      applyFrame(frameIndexRef.current);
    }, intervalMs);
    return () => clearInterval(timer);
    // applyFrame reads latest data via refs, so it is intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceData, isPlaying, secondsPerFrame, whenFinishedRef]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [width, height]);

  const handlePlayPause = () => {
    // If holding at the end, "play" restarts from the first frame.
    if (
      !isPlaying &&
      frameIndexRef.current >= raceData.frames.length - 1 &&
      whenFinished === "hold"
    ) {
      frameIndexRef.current = 0;
      applyFrame(0);
    }
    setIsPlaying((p) => !p);
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div style={{ padding: "8px 8px 0", flex: "0 0 auto" }}>
        <Button onClick={handlePlayPause} colorScheme={colorScheme}>
          {isPlaying ? "Pause" : "Play"}
        </Button>
      </div>
      <div ref={containerRef} style={{ flex: "1 1 auto", minHeight: 0 }} />
    </div>
  );
}
```

- [ ] **Step 4: Verify and commit**

```bash
npm run type-check -w @o2o/viz-bar-race
npm run build -w @o2o/viz-bar-race
git add packages/bar-race
git commit -m "feat(bar-race): play/pause control and loop/hold end behavior"
```

---

## Task 5: Current-frame label overlay + show-frame-label toggle

Shows the current frame value (e.g. the month) large in the bottom-right, the classic bar-race flourish.

**Files:**
- Modify: `packages/bar-race/src/types.ts`
- Modify: `packages/bar-race/src/index.tsx`
- Modify: `packages/bar-race/src/Visualization.tsx`

- [ ] **Step 1: Extend `Settings` in `src/types.ts`**

Replace the `Settings` type with:

```ts
export type Settings = {
  frame?: string;
  category?: string;
  value?: string;
  barsShown?: number;
  secondsPerFrame?: number;
  whenFinished?: WhenFinished;
  showFrameLabel?: boolean;
};
```

- [ ] **Step 2: Add the `showFrameLabel` toggle to `src/index.tsx`**

Inside `settings: { … }` after `whenFinished`, add (note: the `toggle` widget takes no `getProps`):

```tsx
      showFrameLabel: defineSetting({
        id: "showFrameLabel",
        getSection: () => "Display",
        title: "Show frame label",
        widget: "toggle",
        inline: true,
        getDefault: () => true,
      }),
```

- [ ] **Step 3: Render the overlay in `src/Visualization.tsx`**

Add the `formatValue` import at the top (alongside the existing type-only import):

```tsx
import { formatValue } from "@metabase/custom-viz";
```

Add a state hook for the visible frame index, next to the existing `isPlaying` state:

```tsx
  const [frameIndex, setFrameIndex] = useState(0);
```

Update `applyFrame` to also set that state, so the overlay re-renders each frame:

```tsx
  const applyFrame = (index: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    setFrameIndex(index);
    chart.setOption({
      series: [
        {
          type: "bar",
          data: toSeriesData(
            raceDataRef.current.valuesByFrame[index],
            raceDataRef.current.colors,
          ),
        },
      ],
    });
  };
```

In the base-option effect, reset the visible index alongside the ref:

```tsx
    frameIndexRef.current = 0;
    setFrameIndex(0);
```

Compute the label just before `return` and render it as an absolutely-positioned overlay. Add this before the `return`:

```tsx
  const showFrameLabel = settings.showFrameLabel !== false;
  const frameLabel =
    raceData.frames.length > 0
      ? formatValue(raceData.frames[frameIndex] ?? raceData.frames[0], {
          column: raceData.frameCol,
        })
      : "";
```

Then, inside the outer `<div>` (which already has `position: "relative"`), add this overlay as the last child, after the chart `<div>`:

```tsx
      {showFrameLabel && (
        <div
          style={{
            position: "absolute",
            right: 24,
            bottom: 32,
            fontSize: 32,
            fontWeight: 700,
            opacity: 0.35,
            pointerEvents: "none",
            color: colorScheme === "dark" ? "#c9d1d9" : "#57606a",
          }}
        >
          {frameLabel}
        </div>
      )}
```

- [ ] **Step 4: Verify and commit**

```bash
npm run type-check -w @o2o/viz-bar-race
npm run build -w @o2o/viz-bar-race
git add packages/bar-race
git commit -m "feat(bar-race): current-frame label overlay with show/hide toggle"
```

---

## Task 6: Drill-through click + hover tooltip

Wires ECharts bar events to the SDK's `onClick`/`onHover` so clicking a bar drills into the underlying `(frame, category, value)` row and hovering shows a tooltip.

**Files:**
- Modify: `packages/bar-race/src/Visualization.tsx`

- [ ] **Step 1: Add the required imports**

At the top of `src/Visualization.tsx`, update the SDK import to bring in the click/hover types and `RowValue`:

```tsx
import type {
  ClickObject,
  CustomVisualizationProps,
  RowValue,
} from "@metabase/custom-viz";
import { formatValue } from "@metabase/custom-viz";
```

Update the component's parameter destructuring to also pull in the `onClick` and
`onHover` props (aliased so they don't collide with the ref names):

```tsx
export function VisualizationComponent({
  width,
  height,
  settings,
  series,
  colorScheme,
  onClick: onClickCb,
  onHover: onHoverCb,
}: CustomVisualizationProps<Settings>) {
```

Then add these four refs alongside the existing `raceDataRef` declaration:

```tsx
  const onClickRef = useLatest(onClickCb);
  const onHoverRef = useLatest(onHoverCb);
  const seriesRef = useLatest(series);
  const settingsRef = useLatest(settings);
```

- [ ] **Step 2: Register chart event handlers in the init effect**

Replace the init-and-dispose `useEffect` with:

```tsx
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;

    chart.on("click", (params: echarts.ECElementEvent) => {
      if (typeof onClickRef.current !== "function") return;
      const rd = raceDataRef.current;
      const catIndex = params.dataIndex;
      const frame = rd.frames[frameIndexRef.current];
      const category = rd.categories[catIndex];
      if (frame == null || category == null) return;
      const value = rd.valuesByFrame[frameIndexRef.current]?.[catIndex];
      const rowIndex = rd.rowLookup.get(rowKey(frame, category));
      const rows = seriesRef.current[0].data.rows;
      const cols = seriesRef.current[0].data.cols;
      const row = rowIndex != null ? rows[rowIndex] : undefined;

      const clickObject: ClickObject<Settings> = {
        value,
        column: rd.valueCol,
        dimensions: [
          { value: frame, column: rd.frameCol },
          { value: category, column: rd.categoryCol },
        ],
        event: params.event?.event as MouseEvent | undefined,
        origin: row ? { row: row as RowValue[], cols } : undefined,
        settings: settingsRef.current,
      };
      onClickRef.current(clickObject);
    });

    chart.on("mouseover", (params: echarts.ECElementEvent) => {
      if (typeof onHoverRef.current !== "function") return;
      const rd = raceDataRef.current;
      const catIndex = params.dataIndex;
      const frame = rd.frames[frameIndexRef.current];
      const category = rd.categories[catIndex];
      if (frame == null || category == null) return;
      const value = rd.valuesByFrame[frameIndexRef.current]?.[catIndex];
      onHoverRef.current({
        value,
        column: rd.valueCol,
        data: [
          { key: rd.frameCol.display_name, col: rd.frameCol, value: frame },
          {
            key: rd.categoryCol.display_name,
            col: rd.categoryCol,
            value: category,
          },
          {
            key: rd.valueCol.display_name,
            col: rd.valueCol,
            value: value ?? 0,
          },
        ],
        event: params.event?.event as MouseEvent | undefined,
      });
    });

    chart.on("mouseout", () => onHoverRef.current?.(null));

    return () => {
      chart.dispose();
      chartRef.current = null;
    };
  }, [colorScheme, onClickRef, onHoverRef, raceDataRef, seriesRef, settingsRef]);
```

- [ ] **Step 3: Add the `rowKey` import**

Update the data import at the top of the file:

```tsx
import { getRaceData, rowKey } from "./utils/data";
```

- [ ] **Step 4: Verify and commit**

```bash
npm run type-check -w @o2o/viz-bar-race
npm run build -w @o2o/viz-bar-race
git add packages/bar-race
git commit -m "feat(bar-race): drill-through click and hover tooltip"
```

---

## Task 7: Package README + final build + manual verification

**Files:**
- Replace: `packages/bar-race/README.md`

- [ ] **Step 1: Write `packages/bar-race/README.md`**

```markdown
# @o2o/viz-bar-race

A "bar chart race" custom visualization for Metabase: an animated horizontal
bar chart whose bars re-rank across successive time frames.

Requires Metabase `>= 62`.

## Data requirements

Long-format query with three columns:

- **Frame column** (time/ordinal) — each distinct value is one animation frame.
- **Category column** — the racing bars.
- **Value column** (numeric) — bar length.

A category missing in a frame is treated as `0` for that frame. The frame column
needs at least 2 distinct values.

## Settings

| Setting           | Description                                            |
| ----------------- | ------------------------------------------------------ |
| Frame column      | Time/ordinal column that drives the animation frames.  |
| Category column   | The racing bars.                                       |
| Value column      | Numeric column used for bar length.                    |
| Bars shown        | Number of top bars visible while racing (default 10).  |
| Seconds per frame | Duration of each frame transition (default 3).         |
| When finished     | Loop (restart) or Hold at end.                         |
| Show frame label  | Show the current frame value overlay.                  |

## Development

Run from this package directory (`packages/bar-race/`):

    npm run dev         # watch build + preview
    npm run build       # compiles src/ -> dist/, then packages a .tgz
    npm run type-check  # tsc --noEmit

`npm run build` writes `Bar Race-1.0.0.tgz`; upload it in
**Admin -> Custom visualizations -> Add**.
```

- [ ] **Step 2: Final full-monorepo verification**

```bash
npm run type-check
npm run build
npm run prettier
git diff --exit-code
```

Expected: type-check and build pass for **both** packages; prettier reports no changes (or, if it reformats, re-stage before committing).

- [ ] **Step 3: Manual dev-server check**

Run from `packages/bar-race/`:

```bash
npm run dev
```

Then connect Metabase's custom-viz dev bundle to `http://localhost:5174` (per the
landing page it serves) and open a question whose query returns a
`time / category / value` result (e.g. `sales grouped by month and product`).
Confirm:

- On load, bars appear and animate, re-sorting each frame.
- The value labels and x-axis format via the value column's formatting.
- Each category keeps a stable color as it moves.
- "Bars shown" limits the visible bar count; "Seconds per frame" changes speed.
- "When finished = Loop" restarts; "Hold at end" stops on the last frame, and the
  Play button then restarts from the first frame.
- The frame-label overlay shows the current frame and hides when the toggle is off.
- Clicking a bar opens Metabase's drill-through menu; hovering shows a tooltip.

- [ ] **Step 4: Commit**

```bash
git add packages/bar-race
git commit -m "docs(bar-race): package README and finalize v1"
```

---

## Self-Review (completed during authoring)

**Spec coverage:** long-format data contract → Task 2 (`getRaceData`, field settings, `checkRenderable`); missing-as-0 → Task 2 (`valuesByFrame` fill); `checkRenderable` rules → Task 2; autoplay + realtimeSort engine → Task 3; bars-shown / seconds-per-frame → Task 3; play/pause → Task 4; loop/hold → Task 4; stable per-category o2o colors → Task 2 (`colors.ts`); frame-label overlay + toggle → Task 5; click drill-through + hover → Task 6; copy-now/extract-shared-later → honored (helpers copied, no `@o2o/viz-shared`); testing via type-check/build/manual → Task 7. No gaps.

**Placeholder scan:** No "TBD"/"TODO"/"handle edge cases" left. Every code step shows full code. (Task 6 Step 1 was reworded to show the destructuring change and the four refs directly, with no throwaway line.)

**Type consistency:** `getOption(categories, values, colors, barsShown, secondsPerFrame, colorScheme, valueCol)` and `toSeriesData(values, colors)` signatures are used consistently in Tasks 2–5. `RaceData` fields (`frames`, `categories`, `valuesByFrame`, `colors`, `frameCol`, `categoryCol`, `valueCol`, `rowLookup`) are referenced consistently. `rowKey(frame, category)` defined in Task 2, imported in Task 6. `Settings` grows monotonically (Tasks 2→3→4→5) and its keys always match the settings map, satisfying `Record<keyof Settings, …>`.
