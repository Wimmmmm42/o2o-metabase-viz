import type { Column } from "@metabase/custom-viz";
import { formatValue } from "@metabase/custom-viz";
import * as echarts from "echarts";
import {
  CellShape,
  DateString,
  MonthLabelFormatterParams,
  Value,
} from "./types";
import {
  EMPTY_CELL_COLOR,
  EMPTY_CELL_COLOR_DARK,
  getColorScale,
  TEXT_COLOR,
  TEXT_COLOR_DARK,
} from "./utils/colors";
import {
  formatColumnAsMonth,
  getAllDatesForYear,
  getWeekDaysLabels,
  toISODateString,
} from "./utils/data";
import {
  CALENDAR_DAY_LABEL_WIDTH,
  CALENDAR_ROWS,
  CALENDAR_TOP,
  getBorderRadius,
  PADDING,
  VISUALMAP_GAP,
} from "./utils/looks";

export const getOption = (
  data: Array<[DateString, Value]>,
  displayedYear: number,
  color: string,
  color2: string,
  color3: string,
  legendValues: boolean,
  colorScheme: "light" | "dark" | undefined,
  cellSize: number,
  cellShape: CellShape | undefined,
  dimensionCol: Column,
  metricCol: Column,
): echarts.EChartsCoreOption => {
  const shades = getColorScale(color, color2, color3);
  const isDarkScheme = colorScheme === "dark";
  const labelColor = isDarkScheme ? TEXT_COLOR_DARK : TEXT_COLOR;
  const displayedYearData = data.filter(([date]) => {
    const d = new Date(date);
    return !isNaN(d.getTime()) && d.getFullYear() === displayedYear;
  });
  const values = displayedYearData.map(([_, value]) => value);

  const dataMap = new Map(
    displayedYearData.map(([date, val]) => [toISODateString(date), val]),
  );

  const allDates = getAllDatesForYear(displayedYear);
  const actualData: [string, number][] = allDates
    .filter((date) => dataMap.has(date))
    .map((date) => [date, dataMap.get(date)!]);
  const emptyData: [string, number][] = allDates
    .filter((date) => !dataMap.has(date))
    .map((date) => [date, 0]);

  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 100;

  const borderRadius = getBorderRadius(cellShape, cellSize);

  type Piece = {
    min?: number;
    max?: number;
    gt?: number;
    lte?: number;
    color: string;
    label?: string;
  };
  // In "show values" mode each marker is labelled with its upper bound, so the
  // ramp reads 0,1,…,10 when max = 10 (value 5 = color1, value 6 = color2, etc).
  const label = (value: number): string | undefined =>
    legendValues ? formatValue(value, { column: metricCol }) : undefined;
  const pieces: Piece[] = [
    { min: 0, max: 0, color: shades[0], label: label(0) },
    ...shades.map((color, i): Piece => {
      const lower = (max * i) / 10;
      const upper = (max * (i + 1)) / 10;
      return i === shades.length - 1
        ? { gt: lower, color, label: label(max) }
        : { gt: lower, lte: upper, color, label: label(upper) };
    }),
  ];

  return {
    backgroundColor: "transparent",
    tooltip: { show: false },
    visualMap: {
      min,
      max,
      type: "piecewise" as const,
      orient: "horizontal" as const,
      top: CALENDAR_TOP + CALENDAR_ROWS * cellSize + VISUALMAP_GAP,
      left: "center",
      bottom: null,
      itemSymbol: "circle",
      seriesIndex: 1,
      inRange: {
        color: shades,
      },
      pieces,
      showLabel: legendValues,
      formatter: (value: number) => formatValue(value, { column: metricCol }),
      text: legendValues ? undefined : ["More", "Less"],
      itemWidth: 10,
      itemHeight: 10,
      itemGap: legendValues ? 8 : 5,
    },
    calendar: {
      top: CALENDAR_TOP,
      left: PADDING + CALENDAR_DAY_LABEL_WIDTH,
      bottom: null,
      cellSize: [cellSize, cellSize],
      range: displayedYear,
      itemStyle: {
        color: "transparent",
        borderWidth: 4,
        borderColor: "transparent",
        borderRadius,
      },
      splitLine: { show: false },
      yearLabel: { show: false },
      dayLabel: {
        show: true,
        silent: true,
        firstDay: 1,
        color: labelColor,
        fontSize: 11,
        nameMap: getWeekDaysLabels(dimensionCol),
      },
      monthLabel: {
        silent: true,
        color: labelColor,
        fontSize: 11,
        formatter: (params: MonthLabelFormatterParams) =>
          formatColumnAsMonth(
            // echarts passes M as a 1-based month (1 = January), so subtract
            // 1 for the 0-based Date month. UTC noon keeps it timezone-proof
            // (a local-midnight first-of-month can roll to an adjacent month).
            new Date(Date.UTC(parseInt(params.yyyy), params.M - 1, 1, 12)),
            dimensionCol,
          ),
      },
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data: emptyData,
        silent: true,
        itemStyle: {
          color: isDarkScheme ? EMPTY_CELL_COLOR_DARK : EMPTY_CELL_COLOR,
          borderRadius,
        },
      },
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data: actualData,
        itemStyle: {
          borderRadius,
        },
      },
    ],
  };
};
