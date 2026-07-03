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

// U+001F (ASCII unit separator) — a delimiter that never appears in real
// column values, so (frame, category) keys can't collide.
export function rowKey(frame: string, category: string): string {
  return `${frame}\u001F${category}`;
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
    const raw = Number(row[valIdx]);
    const value = Number.isFinite(raw) ? raw : 0;
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
