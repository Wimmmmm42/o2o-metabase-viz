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
