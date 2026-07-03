import type { CustomVisualizationProps } from "@metabase/custom-viz";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";
import { getOption } from "./settings";
import type { Settings } from "./types";
import { getRaceData } from "./utils/data";

export function VisualizationComponent({
  width,
  height,
  settings,
  series,
  colorScheme,
}: CustomVisualizationProps<Settings>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const raceData = useMemo(
    () => getRaceData(series, settings),
    [series, settings],
  );

  // init + dispose
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    return () => {
      chart.dispose();
      chartRef.current = null;
    };
  }, [colorScheme]);

  // apply the first frame's option
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const option = getOption(
      raceData.categories,
      raceData.valuesByFrame[0] ?? [],
      raceData.colors,
      10,
      3,
      colorScheme,
      raceData.valueCol,
    );
    chart.setOption(option, true);
  }, [raceData, colorScheme]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [width, height]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
