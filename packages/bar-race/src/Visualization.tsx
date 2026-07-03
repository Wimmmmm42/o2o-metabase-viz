import type { CustomVisualizationProps } from "@metabase/custom-viz";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLatest } from "./hooks/useLatest";
import { getOption, toSeriesData } from "./settings";
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
  const frameIndexRef = useRef(0);

  const raceData = useMemo(
    () => getRaceData(series, settings),
    [series, settings],
  );
  const raceDataRef = useLatest(raceData);

  const barsShown = settings.barsShown ?? 10;
  const secondsPerFrame = settings.secondsPerFrame ?? 3;

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

  // (re)apply the base option whenever data/settings change; reset to frame 0
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    frameIndexRef.current = 0;
    chart.setOption(
      getOption(
        raceData.categories,
        raceData.valuesByFrame[0] ?? [],
        raceData.colors,
        barsShown,
        secondsPerFrame,
        colorScheme,
        raceData.valueCol,
      ),
      true,
    );
  }, [raceData, barsShown, secondsPerFrame, colorScheme]);

  // frame-advance timer (autoplay); loops for now (end-behavior added in Task 4)
  useEffect(() => {
    const frameCount = raceData.frames.length;
    if (frameCount < 2 || secondsPerFrame <= 0) return;
    const intervalMs = secondsPerFrame * 1000;
    const timer = setInterval(() => {
      const chart = chartRef.current;
      if (!chart) return;
      const next = (frameIndexRef.current + 1) % frameCount;
      frameIndexRef.current = next;
      chart.setOption({
        series: [
          {
            type: "bar",
            data: toSeriesData(
              raceDataRef.current.valuesByFrame[next],
              raceDataRef.current.colors,
            ),
          },
        ],
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [raceData, secondsPerFrame, raceDataRef]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [width, height]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
