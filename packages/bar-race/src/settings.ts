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
    grid: { top: 12, bottom: 24, left: 12, right: 24, containLabel: true },
    xAxis: {
      // Pin the origin at 0 so the bar baseline / value-axis stays glued to 0
      // instead of drifting as ECharts re-derives the min each animated frame.
      min: 0,
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
      // Category names are drawn inside the bars (see series.label), so the
      // axis labels/ticks are hidden to avoid duplication and re-sort jitter.
      axisLabel: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        realtimeSort: true,
        type: "bar",
        data: toSeriesData(values, colors),
        label: {
          show: true,
          position: "insideRight",
          valueAnimation: true,
          color: "#ffffff",
          fontWeight: "bold",
          // A dark halo keeps the white label legible on any bar colour.
          textShadowColor: "rgba(0, 0, 0, 0.55)",
          textShadowBlur: 3,
          formatter: (params: { value: number; dataIndex: number }) =>
            `${categories[params.dataIndex]}  ${formatValue(params.value, {
              column: valueCol,
            })}`,
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
