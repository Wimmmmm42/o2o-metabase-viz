import type { CustomVisualizationProps } from "@metabase/custom-viz";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./components/Button";
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
  const [isPlaying, setIsPlaying] = useState(true);

  const raceData = useMemo(
    () => getRaceData(series, settings),
    [series, settings],
  );
  const raceDataRef = useLatest(raceData);

  const barsShown = settings.barsShown ?? 10;
  const secondsPerFrame = settings.secondsPerFrame ?? 3;
  const whenFinished = settings.whenFinished ?? "loop";
  const whenFinishedRef = useLatest(whenFinished);

  const applyFrame = (index: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption({
      series: [
        {
          type: "bar",
          data: toSeriesData(
            raceDataRef.current.valuesByFrame[index],
            raceDataRef.current.colors,
          ),
        },
      ],
    });
  };

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

  // NOTE: keep this effect declared BEFORE the timer effect — it resets
  // frameIndexRef to 0 so the timer never references a stale/out-of-range
  // frame after data or settings change.
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
    setIsPlaying(true);
  }, [raceData, barsShown, secondsPerFrame, colorScheme]);

  // frame-advance timer, honoring play/pause and the when-finished setting
  useEffect(() => {
    const frameCount = raceData.frames.length;
    if (
      !isPlaying ||
      frameCount < 2 ||
      !Number.isFinite(secondsPerFrame) ||
      secondsPerFrame <= 0
    )
      return;
    const intervalMs = secondsPerFrame * 1000;
    const timer = setInterval(() => {
      const atLast = frameIndexRef.current >= frameCount - 1;
      if (atLast) {
        if (whenFinishedRef.current === "hold") {
          setIsPlaying(false);
          return;
        }
        frameIndexRef.current = 0;
      } else {
        frameIndexRef.current += 1;
      }
      applyFrame(frameIndexRef.current);
    }, intervalMs);
    return () => clearInterval(timer);
    // applyFrame reads latest data via refs, so it is intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceData, isPlaying, secondsPerFrame, whenFinishedRef]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [width, height]);

  const handlePlayPause = () => {
    // If holding at the end, "play" restarts from the first frame.
    if (
      !isPlaying &&
      frameIndexRef.current >= raceData.frames.length - 1 &&
      whenFinished === "hold"
    ) {
      frameIndexRef.current = 0;
      applyFrame(0);
    }
    setIsPlaying((p) => !p);
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div style={{ padding: "8px 8px 0", flex: "0 0 auto" }}>
        <Button onClick={handlePlayPause} colorScheme={colorScheme}>
          {isPlaying ? "Pause" : "Play"}
        </Button>
      </div>
      <div ref={containerRef} style={{ flex: "1 1 auto", minHeight: 0 }} />
    </div>
  );
}
