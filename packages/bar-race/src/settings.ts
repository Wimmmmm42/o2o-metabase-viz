import type { Column } from "@metabase/custom-viz";
import { formatValue } from "@metabase/custom-viz";
import * as echarts from "echarts";
import { TEXT_COLOR, TEXT_COLOR_DARK } from "./utils/colors";

/** ECharts bar-series data items with per-category colors. */
export function toSeriesData(values: number[], colors: string[]) {
  return values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } }));
}

export function getOption(
  categories: string[],
  values: number[],
  colors: string[],
  barsShown: number,
  secondsPerFrame: number,
  colorScheme: "light" | "dark",
  valueCol: Column,
): echarts.EChartsCoreOption {
  const labelColor = colorScheme === "dark" ? TEXT_COLOR_DARK : TEXT_COLOR;
  const durationMs = Math.max(0, secondsPerFrame * 1000);
  return {
    backgroundColor: "transparent",
    grid: { top: 12, bottom: 24, left: 12, right: 90, containLabel: true },
    xAxis: {
      max: "dataMax",
      axisLabel: {
        color: labelColor,
        formatter: (n: number) => formatValue(n, { column: valueCol }),
      },
    },
    yAxis: {
      type: "category",
      data: categories,
      inverse: true,
      max: Math.max(0, barsShown - 1),
      animationDuration: 300,
      animationDurationUpdate: 300,
      axisLabel: { color: labelColor },
    },
    series: [
      {
        realtimeSort: true,
        type: "bar",
        data: toSeriesData(values, colors),
        label: {
          show: true,
          position: "right",
          valueAnimation: true,
          color: labelColor,
          formatter: (params: { value: number }) =>
            formatValue(params.value, { column: valueCol }),
        },
      },
    ],
    legend: { show: false },
    animationDuration: 0,
    animationDurationUpdate: durationMs,
    animationEasing: "linear",
    animationEasingUpdate: "linear",
  };
}
