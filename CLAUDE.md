# o2o-metabase-viz — working notes for Claude

Monorepo of Metabase custom visualizations. One plugin per folder under
`packages/`, sharing tooling and the knowledge below.

## Repo shape

- **npm workspaces**, globbed as `packages/*`. Deps hoist to the root
  `node_modules`; there is one root `package-lock.json`.
- Root scripts fan out: `npm run build` / `npm run type-check` run in every
  package (`--workspaces --if-present`); `npm run prettier` formats the repo.
  CI (`.github/workflows/`) calls these exact root script names.
- Each package extends `../../tsconfig.base.json` and owns its `vite.config.ts`,
  `pack.mjs`, and `metabase-plugin.json`. Those build scripts resolve paths from
  their own location (`__dirname` / `import.meta.url`), so a package is fully
  self-contained and relocatable.
- Build output: `vite build` → `dist/`, then `pack.mjs` → `<plugin-name>-<version>.tgz`
  in the package folder. Upload that `.tgz` via **Admin → Custom visualizations → Add**.

## The custom-viz SDK contract

Every viz is a React component registered via `defineConfig`. The contract
(see `packages/calendar-heatmap/src/index.tsx` and `Visualization.tsx`):

- **Entry** (`src/index.tsx`): default-export a
  `CreateCustomVisualization<Settings>` factory. The SDK calls it with
  `{ defineSetting, locale }` and expects a `defineConfig<Settings>({ id,
getName, minSize, defaultSize, checkRenderable, settings,
VisualizationComponent })` back. `defineSetting` is injected here (not imported)
  — it's what you use to declare each setting below.
- **`VisualizationComponent`**: a React component receiving
  `CustomVisualizationProps<Settings>` = `{ height, width, settings, series,
onClick, onHover, colorScheme }`. Render anything you want into the div.
- **Data** arrives as `series[0].data.cols` (column metadata: `name`,
  `display_name`, plus type flags) and `series[0].data.rows` (arrays of raw
  values, column-aligned). Map these into whatever shape your renderer needs —
  see `src/utils/data.ts` (`getChartData`) for the pattern.
- **Settings** are declared with the injected `defineSetting({ id, getSection,
title, widget, getDefault, getProps })`. Widgets: `"field"` (column picker),
  `"color"`, other built-ins Metabase ships (`"number"`, `"input"`, `"toggle"`,
  `"select"`, `"radio"`, …), or a custom React widget component (see
  `CellShapeWidget`).
- **`checkRenderable(series, settings)`** throws human-readable errors when the
  data can't be drawn (wrong column types, unaggregated data, etc.).
- **Interaction**: wire the renderer's click/hover to `onClick`/`onHover` to get
  Metabase drill-through. `Visualization.tsx` shows the ECharts→ClickObject wiring.

The SDK is **render-agnostic** — it hands you a sized div + data + settings and
takes a React component back. The calendar-heatmap renders with **ECharts**
(`echarts.init` in a `useEffect`, option object built in `src/settings.ts`).

## Recipe: convert an ECharts example into an o2o viz

Because the render layer here is ECharts, the fastest source of new vizes is the
[ECharts example gallery](https://echarts.apache.org/examples/). Porting is
close to mechanical:

1. Copy an existing package as the skeleton (see `docs/adding-a-new-viz.md`).
2. **Render**: drop the example's `option` object into the package's
   `getOption()` (the `settings.ts` equivalent).
3. **Data adapter**: replace the example's hardcoded `series[].data` with values
   mapped from `series[0].data.rows` / `cols`.
4. **Settings adapter**: expose the example's tunable bits (colors, axes) as
   `defineSetting` widgets instead of hardcoded values.
5. **Interaction adapter** (optional): forward chart click/hover to
   `onClick`/`onHover`.

Difficulty by source: ECharts examples and React chart components (recharts,
visx, nivo, d3-in-React) are easy; imperative canvas libs (Chart.js, vanilla d3)
need a React init/dispose wrapper — reuse the `echarts.init` + `useEffect`
pattern in `Visualization.tsx`; full apps / non-web tools (matplotlib, Plotly-Py)
are a rewrite, not a conversion.

## Sharing code across vizes (do this when viz #2 needs it)

Not yet extracted — there is only one viz. When a second package needs the o2o
brand palette, the color-ramp logic (`packages/calendar-heatmap/src/utils/colors.ts`),
or data helpers, lift them into a new `packages/shared` workspace published as
`@o2o/viz-shared` and import from there. Don't copy-paste between packages.

## Conventions

- Write **o2o** lowercase, always.
- npm package scope is `@o2o/viz-<name>`; the `metabase-plugin.json` `name` is
  the human-facing plugin title shown in Metabase.
- Node `>= 22`.
