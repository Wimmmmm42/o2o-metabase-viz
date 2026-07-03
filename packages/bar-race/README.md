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

| Setting           | Description                                           |
| ----------------- | ----------------------------------------------------- |
| Frame column      | Time/ordinal column that drives the animation frames. |
| Category column   | The racing bars.                                      |
| Value column      | Numeric column used for bar length.                   |
| Bars shown        | Number of top bars visible while racing (default 10). |
| Seconds per frame | Duration of each frame transition (default 3).        |
| When finished     | Loop (restart) or Hold at end.                        |
| Show frame label  | Show the current frame value overlay.                 |

## Development

Run from this package directory (`packages/bar-race/`):

    npm run dev         # watch build + preview
    npm run build       # compiles src/ -> dist/, then packages a .tgz
    npm run type-check  # tsc --noEmit

`npm run build` writes `Bar Race-1.0.0.tgz`; upload it in
**Admin -> Custom visualizations -> Add**.
