import type {
  ClickObject,
  CustomVisualizationProps,
  RowValue,
} from "@metabase/custom-viz";
import { formatValue } from "@metabase/custom-viz";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./components/Button";
import { useLatest } from "./hooks/useLatest";
import { getOption, toSeriesData } from "./settings";
import type { Settings } from "./types";
import { getRaceData, rowKey } from "./utils/data";

export function VisualizationComponent({
  width,
  height,
  settings,
  series,
  colorScheme,
  onClick: onClickCb,
  onHover: onHoverCb,
}: CustomVisualizationProps<Settings>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const frameIndexRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);

  const raceData = useMemo(
    () => getRaceData(series, settings),
    [series, settings],
  );
  const raceDataRef = useLatest(raceData);
  const onClickRef = useLatest(onClickCb);
  const onHoverRef = useLatest(onHoverCb);
  const seriesRef = useLatest(series);
  const settingsRef = useLatest(settings);

  const barsShown = settings.barsShown ?? 10;
  const secondsPerFrame = settings.secondsPerFrame ?? 3;
  const whenFinished = settings.whenFinished ?? "loop";
  const whenFinishedRef = useLatest(whenFinished);

  const applyFrame = (index: number, fast = false) => {
    const chart = chartRef.current;
    if (!chart) return;
    setFrameIndex(index);
    chart.setOption({
      // Normal ticks animate over the frame duration; scrubbing jumps quickly.
      animationDurationUpdate: fast ? 200 : Math.max(0, secondsPerFrame * 1000),
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

    chart.on("click", (params: echarts.ECElementEvent) => {
      if (params.componentType !== "series") return;
      if (typeof onClickRef.current !== "function") return;
      const rd = raceDataRef.current;
      const catIndex = params.dataIndex;
      const frame = rd.frames[frameIndexRef.current];
      const category = rd.categories[catIndex];
      if (frame == null || category == null) return;
      const value = rd.valuesByFrame[frameIndexRef.current]?.[catIndex];
      const rowIndex = rd.rowLookup.get(rowKey(frame, category));
      const rows = seriesRef.current[0].data.rows;
      const cols = seriesRef.current[0].data.cols;
      const row = rowIndex != null ? rows[rowIndex] : undefined;

      const clickObject: ClickObject<Settings> = {
        value,
        column: rd.valueCol,
        dimensions: [
          { value: frame, column: rd.frameCol },
          { value: category, column: rd.categoryCol },
        ],
        event: params.event?.event as MouseEvent | undefined,
        origin: row ? { row: row as RowValue[], cols } : undefined,
        settings: settingsRef.current,
      };
      onClickRef.current(clickObject);
    });

    chart.on("mouseover", (params: echarts.ECElementEvent) => {
      if (params.componentType !== "series") return;
      if (typeof onHoverRef.current !== "function") return;
      const rd = raceDataRef.current;
      const catIndex = params.dataIndex;
      const frame = rd.frames[frameIndexRef.current];
      const category = rd.categories[catIndex];
      if (frame == null || category == null) return;
      const value = rd.valuesByFrame[frameIndexRef.current]?.[catIndex];
      onHoverRef.current({
        value,
        column: rd.valueCol,
        data: [
          { key: rd.frameCol.display_name, col: rd.frameCol, value: frame },
          {
            key: rd.categoryCol.display_name,
            col: rd.categoryCol,
            value: category,
          },
          {
            key: rd.valueCol.display_name,
            col: rd.valueCol,
            value: value ?? 0,
          },
        ],
        event: params.event?.event as MouseEvent | undefined,
      });
    });

    chart.on("mouseout", () => onHoverRef.current?.(null));

    return () => {
      chart.dispose();
      chartRef.current = null;
    };
  }, [
    colorScheme,
    onClickRef,
    onHoverRef,
    raceDataRef,
    seriesRef,
    settingsRef,
  ]);

  // NOTE: keep this effect declared BEFORE the timer effect — it resets
  // frameIndexRef to 0 so the timer never references a stale/out-of-range
  // frame after data or settings change.
  // (re)apply the base option whenever data/settings change; reset to frame 0
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    frameIndexRef.current = 0;
    setFrameIndex(0);
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

  const handleScrub = (index: number) => {
    // Scrubbing pauses playback and jumps straight to the chosen frame.
    setIsPlaying(false);
    frameIndexRef.current = index;
    applyFrame(index, true);
  };

  const frameCount = raceData.frames.length;
  const showFrameLabel = settings.showFrameLabel !== false;
  const frameLabel =
    frameCount > 0
      ? formatValue(raceData.frames[frameIndex] ?? raceData.frames[0], {
          column: raceData.frameCol,
        })
      : "";
  const sliderAccent = colorScheme === "dark" ? "#c9d1d9" : "#0029d6";
  const labelTextColor = colorScheme === "dark" ? "#c9d1d9" : "#1f2933";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px 4px",
          flex: "0 0 auto",
        }}
      >
        <Button onClick={handlePlayPause} colorScheme={colorScheme}>
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <input
          type="range"
          min={0}
          max={Math.max(0, frameCount - 1)}
          value={frameIndex}
          onChange={(e) => handleScrub(Number(e.target.value))}
          aria-label="Animation frame"
          style={{
            flex: "1 1 auto",
            cursor: "pointer",
            accentColor: sliderAccent,
          }}
        />
        {showFrameLabel && (
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              whiteSpace: "nowrap",
              textAlign: "right",
              minWidth: 64,
              color: labelTextColor,
            }}
          >
            {frameLabel}
          </span>
        )}
      </div>
      <div ref={containerRef} style={{ flex: "1 1 auto", minHeight: 0 }} />
    </div>
  );
}
