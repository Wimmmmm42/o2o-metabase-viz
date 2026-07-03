# @o2o/viz-calendar-heatmap

A Calendar Heatmap custom visualization for Metabase. Renders a GitHub-style year calendar where each cell represents a day, colored by an aggregated metric value.

Requires Metabase `>= 62`.

![calendar heatmap](./assets/calendar-heatmap.webp)

## Data requirements

The query must return two columns:

- **Date column** (dimension) — used as the day for each cell.
- **Numeric column** (metric) — used to color each cell.

Rows must be aggregated by day; multiple rows with the same date will fail to render.

## Settings

| Setting       | Description                                                         |
| ------------- | ------------------------------------------------------------------- |
| Date column   | Date dimension column. Auto-selected from the first date column.    |
| Metric column | Numeric metric column. Auto-selected from the first numeric column. |
| Color 1       | Start color of the heatmap ramp.                                    |
| Color 2       | End color of the heatmap ramp.                                      |
| Cell Shape    | Square, rounded, or circle.                                         |

## Development

Run these from **this package directory** (`packages/calendar-heatmap/`):

```bash
npm run dev         # watch build + preview
npm run build       # compiles src/ → dist/, then packages it into a .tgz
npm run type-check  # tsc --noEmit
```

`npm run build` writes `<name>-<version>.tgz` to this package folder. Upload that
file in **Admin → Custom visualizations → Add** to register the plugin.

> The packaged archive contains `metabase-plugin.json` plus the build output
> (`dist/index.js` and any whitelisted `dist/assets/*`).

From the **repo root** you can build/type-check every viz at once with
`npm run build` / `npm run type-check`, and format with `npm run prettier`.
