# Adding a new visualization

Each viz is a self-contained workspace under `packages/`. Scaffold one two ways —
with Metabase's official CLI, or by copying an existing package. Either way the
result is a folder under `packages/` that the `packages/*` workspace glob picks
up automatically.

## Prerequisites

- **Node** `>= 22` (repo-wide; see the root `package.json`).
- A **Metabase Pro or Enterprise** instance (Cloud or self-hosted), version
  `>= 1.62` — custom visualizations aren't on the free/OSS plan. The minimum
  version is declared per package in `metabase-plugin.json`.
- Comfort with **React + TypeScript**. The render layer here is ECharts.
- Full upstream reference:
  <https://www.metabase.com/docs/latest/developers-guide/custom-visualizations>

## 1. Scaffold the package

### Option A — official CLI (freshest SDK skeleton)

```bash
# from the packages/ directory, so the folder lands in the right place
cd packages
npx @metabase/custom-viz init <your-viz>
```

This generates a standalone starter (a working "thumbs up / thumbs down"
threshold example) with `src/index.tsx`, `metabase-plugin.json`,
`public/assets/icon.svg`, `package.json`, `vite.config.ts`, and `pack.mjs`. Then
adapt it to the monorepo:

- `packages/<your-viz>/package.json` → set `"name": "@o2o/viz-<your-viz>"`.
- `packages/<your-viz>/tsconfig.json` → extend the shared base:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "outDir": "dist" },
    "include": ["src"]
  }
  ```
- Leave `vite.config.ts` and `pack.mjs` as generated — they resolve paths from
  their own location, so they work unchanged inside `packages/`.

Use this when you want the latest SDK scaffold, or the starter example to learn
from.

### Option B — copy an existing package (best for porting)

```bash
# from the repo root
cp -R packages/calendar-heatmap packages/<your-viz>
rm -rf packages/<your-viz>/dist packages/<your-viz>/*.tgz
```

Use this when porting an ECharts example, or when you want a package that already
matches every repo convention (base tsconfig, scripts, o2o palette wiring). See
the conversion recipe in [../CLAUDE.md](../CLAUDE.md).

## 2. Rename it

In `packages/<your-viz>/package.json`:

- `name` → `@o2o/viz-<your-viz>`
- reset `version` to `1.0.0`

In `packages/<your-viz>/metabase-plugin.json`:

- `name` → the human-facing plugin title (this is what Metabase displays)
- `icon` → your icon filename in `public/assets/` (and list any extra bundled
  files under `assets`)

In `packages/<your-viz>/src/index.tsx`, the viz is a `CreateCustomVisualization`
factory that returns `defineConfig(...)`:

- `defineConfig({ id: "<your-viz>", getName: () => "...", ... })`

## 3. Swap in your render logic

Everything the SDK gives you and expects back is documented in
[../CLAUDE.md](../CLAUDE.md) ("The custom-viz SDK contract"). The pieces you'll
touch:

- `src/index.tsx` — the `CreateCustomVisualization` factory: `settings` (built
  with the injected `defineSetting`), `checkRenderable`, sizing, and the
  registered `VisualizationComponent`.
- `src/Visualization.tsx` — the React component. Keep the `echarts.init` +
  `useEffect` lifecycle if you render with ECharts.
- `src/settings.ts` — build the ECharts `option` (or your renderer's config).
- `src/utils/data.ts` — map `series[0].data.{cols,rows}` into your chart's shape.
- `src/utils/`, `src/components/`, `src/types.ts` — trim to what you need.

If you're porting an ECharts example, follow the conversion recipe in
[../CLAUDE.md](../CLAUDE.md).

## 4. Develop with hot reload

The package's build watcher doubles as a Metabase dev server (the
`metabaseDevServer` plugin in `vite.config.ts`), serving `dist/` on
**http://localhost:5174** with an SSE hot-reload channel.

```bash
npm install                 # from repo root — links the new workspace
cd packages/<your-viz>
npm run dev                 # build --watch + dev server on :5174
```

Then, on a Metabase instance started with custom-viz dev mode enabled
(`MB_CUSTOM_VIZ_PLUGIN_DEV_MODE_ENABLED=true`):

1. Go to **Admin → Custom visualizations** and, under the development settings,
   set the dev server URL to `http://localhost:5174`
   (Docker: `http://host.docker.internal:5174`).
2. Your viz appears in the chart picker tagged as a dev visualization and
   reloads on each rebuild.

## 5. Build & package

```bash
cd packages/<your-viz>
npm run type-check
npm run build               # vite build → dist/, then pack.mjs → <plugin-name>-<version>.tgz
```

`npm run build` from the repo root builds every package at once.

## 6. Upload

Upload the `.tgz` via **Admin → Custom visualizations → Add**. Your chart type
then shows up in the visualization picker.

Note: custom visualizations only render in the live app. Static renders (email /
Slack subscriptions, public exports) fall back to a plain table.

## 7. Share, don't copy

If `<your-viz>` needs the o2o brand palette, color-ramp logic, or data helpers
that already exist in another package, don't copy them — lift them into a
`packages/shared` workspace (`@o2o/viz-shared`) and import from there. See the
"Sharing code" note in [../CLAUDE.md](../CLAUDE.md).
