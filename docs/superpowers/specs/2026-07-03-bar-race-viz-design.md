# Bar Race custom-viz — design spec

- **Date:** 2026-07-03
- **Status:** Approved (design); details to be finetuned during/after implementation
- **Package:** `@o2o/viz-bar-race` → `packages/bar-race/`
- **Plugin display name:** "Bar Race" (`metabase-plugin.json` `name`)
- **Visualization id:** `bar-race`

## Overview

A "bar chart race": an animated horizontal bar chart whose bars re-rank across
successive time frames. Adapted from the ECharts
[`bar-race`](https://echarts.apache.org/examples/en/editor.html?c=bar-race)
example, but driven by real query data instead of the example's random-number
timer.

The ECharts example is a mechanics demo (mutates an array with `Math.random()`
every 3s). We keep its animation mechanics — `realtimeSort`, an `inverse`
category axis, `xAxis.max: 'dataMax'`, `label.valueAnimation`, linear easing —
and replace the data source with frames derived from the query.

## Data contract (long format)

The query returns rows in long format; three columns are mapped via settings:

| Role         | Widget            | Meaning                                             | Auto-default                              |
| ------------ | ----------------- | --------------------------------------------------- | ----------------------------------------- |
| **Frame**    | `field` dimension | distinct values sorted ascending = animation frames | first temporal column, else first dimension |
| **Category** | `field` dimension | the racing bars (kept identity across frames)       | first string dimension that is not the frame |
| **Value**    | `field` metric    | bar length                                          | first numeric column                      |

Example:

```
month    | product | sales
2024-01  | A       | 120
2024-01  | B       | 90
2024-02  | A       | 150
2024-02  | B       | 210
```

→ frames = distinct months (sorted); bars = products; each frame sorts bars by
`sales`.

### Missing data

A category absent in a given frame is treated as **0** for that frame. No
interpolation or carry-forward. Predictable and simple.

### `checkRenderable`

Throws human-readable errors (same pattern as calendar-heatmap) when:

- the frame, category, or value column cannot be resolved from the columns, or
- the frame column has fewer than 2 distinct values (nothing to animate).

## Settings

**Data section**

- **Frame column** (`field`) — dimension picker.
- **Category column** (`field`) — dimension picker.
- **Value column** (`field`) — numeric metric picker.

**Display section**

- **Bars shown** — number, default `10`. Maps to `yAxis.max = N - 1` so only the
  top N bars are visible while racing.
- **Seconds per frame** — number, default `3`. Maps to `animationDurationUpdate`
  (ms) and the frame-advance interval.
- **When finished** — enum `Loop` | `Hold at end`.
  - `Loop`: on reaching the last frame, restart from frame 0 and continue.
  - `Hold at end`: stop the timer on the final frame; play button offers replay.
- **Show frame label** — boolean, default `on`. Draws the current frame value
  prominently (bottom-right, classic bar-race style), formatted with the SDK's
  `formatValue`.

## Animation & playback

- **Engine:** a single `bar` series with `realtimeSort: true`. A `setInterval`
  advances a frame index; each tick calls `chart.setOption` with that frame's
  `[value, category]` data. ECharts animates the bar re-sorting between frames.
- **Autoplay:** starts on render.
- **Play/pause:** a single toggle button (reuse `Button` component) starts/stops
  the interval. Pausing holds the current frame.
- **End behavior:** governed by the "When finished" setting (see above).
- **Lifecycle:** `echarts.init` in a `useEffect`; interval cleared on unmount and
  when settings/series change. Reuse the `useLatest` ref pattern from
  calendar-heatmap so the timer callback reads current props without re-subscribing.

## Colors

Each category is assigned a **stable color** from the o2o brand categorical
palette, keyed by category value, so a bar keeps the same color as it moves and
re-ranks. If categories outnumber palette entries, fall back to a deterministic
generated color per category. Consistent with the o2o-brand palette and dataviz
guidance.

## Interaction

- **Click a bar** → drill-through to the underlying `(frame, category, value)`
  row via `ClickObject`, mirroring calendar-heatmap's click wiring in
  `Visualization.tsx`.
- **Hover** → tooltip showing the category and the value formatted via
  `formatValue`.

## Architecture & files

Copy the calendar-heatmap package skeleton, then swap in bar-race logic:

```
packages/bar-race/
├── package.json            # @o2o/viz-bar-race, version 1.0.0
├── tsconfig.json           # extends ../../tsconfig.base.json
├── vite.config.ts          # copied (paths resolve from __dirname)
├── pack.mjs                # copied (paths resolve from import.meta.url)
├── metabase-plugin.json    # name "Bar Race", icon
├── README.md
├── public/assets/          # icon svg
└── src/
    ├── index.tsx           # defineConfig: id, settings, checkRenderable, sizing
    ├── Visualization.tsx   # echarts init + frame-advance timer + play/pause + click/hover
    ├── settings.ts         # getOption(frameData, opts) builder
    ├── types.ts            # Settings type
    ├── utils/
    │   ├── data.ts         # getRaceData(series, settings): frames, categories, per-frame values
    │   ├── colors.ts       # category -> stable color assignment
    │   └── isa.ts          # column-type helpers (isDimensionCol / isMetricCol / defaults)
    ├── components/Button.tsx
    └── hooks/useLatest.ts
```

The `packages/*` workspace glob picks the folder up automatically; no root
config changes needed. `npm run build` from the package writes
`Bar Race-1.0.0.tgz`.

### Code reuse decision

This is viz #2, which is the trigger noted in `CLAUDE.md` for extracting a
shared package. Decision for this spec: **copy** the shared helpers (`isa.ts`,
`Button`, `useLatest`, echarts lifecycle) into `packages/bar-race` for v1, and
**extract `@o2o/viz-shared` as a separate follow-up** once bar-race is stable.
This keeps the two efforts decoupled and avoids destabilizing calendar-heatmap.

## Testing / verification

The repo has no unit-test harness. Verification:

- `npm run type-check` passes for the package.
- `npm run build` passes and produces `Bar Race-1.0.0.tgz`.
- Manual: `npm run dev` in the package + upload/dev-connect to Metabase with a
  sample `time / category / value` query; confirm frames advance, bars re-sort,
  play/pause works, and both "When finished" modes behave.

## Out of scope / finetune later

- Extracting `@o2o/viz-shared` (separate follow-up).
- Full playback controls (frame scrubber, speed dropdown) — v1 uses autoplay +
  play/pause only.
- Wide-format data support (long format only).
- Per-bar images/flags/avatars.
- Exact palette mapping and label styling — to be finetuned after first render.
