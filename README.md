# o2o-metabase-viz

A monorepo of custom visualizations for Metabase, built on the
[`@metabase/custom-viz`](https://www.npmjs.com/package/@metabase/custom-viz) SDK.
Each viz is an independent plugin under `packages/` that builds to its own
uploadable `.tgz` — the packaging boundary stays one-plugin-per-folder, while
tooling, config, and know-how are shared across the repo.

## Layout

```
.
├── packages/
│   └── calendar-heatmap/     GitHub-style year calendar heatmap
├── docs/
│   ├── adding-a-new-viz.md   how to add viz #2, #3, …
│   └── superpowers/          per-viz specs & implementation plans
├── tsconfig.base.json        shared TS compiler options (packages extend this)
├── .prettierrc               shared formatting config
└── package.json              npm workspaces root
```

## Commands

Run from the **repo root**:

```bash
npm install          # installs all workspaces (hoisted to root node_modules)
npm run build        # builds every package → each writes its own .tgz
npm run type-check   # tsc --noEmit in every package
npm run prettier     # format the whole repo
npm run build:one -w @o2o/viz-calendar-heatmap   # build a single package
```

Per-package dev (`npm run dev`, `npm run build`) is run from inside that
package's folder — see its README.

## Adding a new viz

See [docs/adding-a-new-viz.md](docs/adding-a-new-viz.md). Short version: copy an
existing package, rename it, swap in your render logic, and it's picked up by
the `packages/*` workspace automatically.

For the SDK contract and the recipe for converting an ECharts example into a
viz, see [CLAUDE.md](CLAUDE.md).
