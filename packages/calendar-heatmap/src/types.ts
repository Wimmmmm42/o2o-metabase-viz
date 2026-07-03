export type CellShape = "square" | "rounded" | "circle";

export type Settings = {
  dimension?: string;
  metric?: string;
  color?: string;
  color2?: string;
  color3?: string;
  cellShape?: CellShape;
  legendValues?: boolean;
};

export type DateString = string;

export type Value = number;

/** `M` is a 1-based month (1 = January), as passed by echarts. */
export type MonthLabelFormatterParams = { yyyy: string; M: number };
