# Adding a new visualization

Each viz is a self-contained workspace under `packages/`. The fastest path is to
copy an existing package and swap in your render logic.

## 1. Copy the skeleton

From the repo root:

```bash
cp -R packages/calendar-heatmap packages/<your-viz>
rm -rf packages/<your-viz>/dist packages/<your-viz>/*.tgz
```

## 2. Rename it

In `packages/<your-viz>/package.json`:

- `name` → `@o2o/viz-<your-viz>`
- reset `version` to `1.0.0`

In `packages/<your-viz>/metabase-plugin.json`:

- `name` → the human-facing plugin title (this is what Metabase displays)
- `icon` → your icon filename in `public/assets/` (and list any extra bundled
  files under `assets`)

In `packages/<your-viz>/src/index.tsx`:

- `defineConfig({ id: "<your-viz>", getName: () => "..." , ... })`

## 3. Swap in your render logic

Everything the SDK gives you and expects back is documented in
[../CLAUDE.md](../CLAUDE.md) ("The custom-viz SDK contract"). The pieces you'll
touch:

- `src/index.tsx` — `settings`, `checkRenderable`, sizing, and the registered
  `VisualizationComponent`.
- `src/Visualization.tsx` — the React component. Keep the `echarts.init` +
  `useEffect` lifecycle if you render with ECharts.
- `src/settings.ts` — build the ECharts `option` (or your renderer's config).
- `src/utils/data.ts` — map `series[0].data.{cols,rows}` into your chart's shape.
- `src/utils/`, `src/components/`, `src/types.ts` — trim to what you need.

If you're porting an ECharts example, follow the conversion recipe in
[../CLAUDE.md](../CLAUDE.md).

## 4. Wire it up

No workspace config changes are needed — `packages/*` picks the folder up
automatically. Just install and build:

```bash
npm install                 # from repo root — links the new workspace
cd packages/<your-viz>
npm run type-check
npm run build               # writes <plugin-name>-<version>.tgz
```

Upload the `.tgz` via **Admin → Custom visualizations → Add**.

## 5. Share, don't copy

If `<your-viz>` needs the o2o brand palette, color-ramp logic, or data helpers
that already exist in another package, don't copy them — lift them into a
`packages/shared` workspace (`@o2o/viz-shared`) and import from there. See the
"Sharing code" note in [../CLAUDE.md](../CLAUDE.md).
