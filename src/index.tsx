import type {
  CreateCustomVisualization,
  CustomStaticVisualizationProps,
  CustomVisualizationProps,
} from "@metabase/custom-viz";
import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";

type Settings = {
  year?: string;
};

function getVirtualData(year: string): [string, number][] {
  const date = +echarts.time.parse(year + "-01-01");
  const end = +echarts.time.parse(+year + 1 + "-01-01");
  const dayTime = 3600 * 24 * 1000;
  const data: [string, number][] = [];
  for (let time = date; time < end; time += dayTime) {
    data.push([
      echarts.time.format(time, "{yyyy}-{MM}-{dd}", false),
      Math.floor(Math.random() * 10000),
    ]);
  }
  return data;
}

function getOption(year: string) {
  const data = getVirtualData(year);
  return {
    title: {
      top: 30,
      left: "center",
      text: `Daily Activity — ${year}`,
    },
    tooltip: {},
    visualMap: {
      min: 0,
      max: 10000,
      type: "piecewise" as const,
      orient: "horizontal" as const,
      left: "center",
      top: 65,
    },
    calendar: {
      top: 120,
      left: 30,
      right: 30,
      cellSize: ["auto", 13],
      range: year,
      itemStyle: {
        borderWidth: 0.5,
      },
      yearLabel: { show: false },
    },
    series: {
      type: "heatmap",
      coordinateSystem: "calendar",
      data,
    },
  };
}

const createVisualization: CreateCustomVisualization<Settings> = () => {
  return {
    id: "grid-heatmap",
    getName: () => "Calendar Heatmap",
    minSize: { width: 4, height: 3 },
    defaultSize: { width: 8, height: 4 },
    isSensible() {
      return true;
    },
    checkRenderable(series) {
      if (series.length === 0) {
        throw new Error("No series provided");
      }
    },
    settings: {
      year: {
        id: "year",
        title: "Year",
        widget: "input",
        getDefault() {
          return String(new Date().getFullYear());
        },
        getProps() {
          return {
            placeholder: "e.g. 2024",
          };
        },
      },
    },
    VisualizationComponent,
    StaticVisualizationComponent,
  };
};

const VisualizationComponent = (props: CustomVisualizationProps<Settings>) => {
  const { height, width, settings } = props;
  const year = settings.year ?? String(new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current);
    }

    chartRef.current.setOption(getOption(year));

    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [year]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
    />
  );
};

const StaticVisualizationComponent = (
  props: CustomStaticVisualizationProps<Settings>,
) => {
  const width = 540;
  const height = 360;
  const { settings } = props;
  const year = settings.year ?? String(new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current, undefined, {
      width,
      height,
    });
    chart.setOption(getOption(year));
    setDataUrl(chart.getDataURL({ type: "png", pixelRatio: 2 }));
    chart.dispose();
  }, [year]);

  if (dataUrl) {
    return <img src={dataUrl} width={width} height={height} />;
  }

  return (
    <div
      ref={containerRef}
      style={{ width, height, visibility: "hidden", position: "absolute" }}
    />
  );
};

export default createVisualization;
