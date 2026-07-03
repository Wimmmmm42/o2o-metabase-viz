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
  colorScheme: "light" | "dark" | undefined,
  cellSize: number,
  cellShape: CellShape | undefined,
  dimensionCol: Column,
  metricCol: Column,
): echarts.EChartsCoreOption => {
  const shades = getColorScale(color, color2);
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
  };
  const pieces: Piece[] = [
    { min: 0, max: 0, color: shades[0] },
    ...shades.map((color, i): Piece => {
      const lower = (max * i) / 10;
      return i === shades.length - 1
        ? { gt: lower, color }
        : { gt: lower, lte: (max * (i + 1)) / 10, color };
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
      showLabel: false,
      formatter: (value: number) => formatValue(value, { column: metricCol }),
      text: ["More", "Less"],
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 5,
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
            // UTC noon so the month is timezone-proof (a local-midnight
            // first-of-month rolls back to the previous month in UTC).
            new Date(Date.UTC(parseInt(params.yyyy), params.M, 1, 12)),
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
