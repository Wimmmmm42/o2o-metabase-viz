import type { CreateCustomVisualization } from "@metabase/custom-viz";
import { defineConfig } from "@metabase/custom-viz";
import type { Settings } from "./types";
import { VisualizationComponent } from "./Visualization";
import {
  findDefaultCategoryName,
  findDefaultFrameName,
  findDefaultValueName,
  isCategoryCol,
  isValueCol,
} from "./utils/isa";

const createVisualization: CreateCustomVisualization<Settings> = ({
  defineSetting,
}) => {
  return defineConfig<Settings>({
    id: "bar-race",
    getName: () => "Bar Race",
    minSize: { width: 6, height: 4 },
    defaultSize: { width: 12, height: 8 },
    checkRenderable(series, settings) {
      if (series.length === 0) {
        throw new Error("No series provided");
      }
      const cols = series[0]?.data?.cols ?? [];
      const frameName = settings.frame ?? findDefaultFrameName(cols);
      const categoryName =
        settings.category ?? findDefaultCategoryName(cols, frameName);
      const valueName = settings.value ?? findDefaultValueName(cols);

      if (!frameName) {
        throw new Error("Please select a column for the frame (time) axis.");
      }
      if (!categoryName) {
        throw new Error("Please select a category column for the bars.");
      }
      if (!valueName) {
        throw new Error("Please select a numeric value column.");
      }

      const frameValues = new Set(
        (series[0]?.data?.rows ?? []).map((row) => {
          const idx = cols.findIndex((c) => c.name === frameName);
          return String(row[idx]);
        }),
      );
      if (frameValues.size < 2) {
        throw new Error(
          "The frame column needs at least 2 distinct values to animate.",
        );
      }
    },
    settings: {
      frame: defineSetting({
        id: "frame",
        getSection: () => "Data",
        title: "Frame column (time)",
        widget: "field",
        getDefault: (series) =>
          findDefaultFrameName(series?.[0]?.data?.cols ?? []),
        getProps: (series) => {
          const cols = series?.[0]?.data?.cols ?? [];
          return {
            columns: cols,
            options: cols.map(({ display_name, name }) => ({
              name: display_name,
              value: name,
            })),
          };
        },
      }),
      category: defineSetting({
        id: "category",
        getSection: () => "Data",
        title: "Category column",
        widget: "field",
        getDefault: (series, settings) =>
          findDefaultCategoryName(
            series?.[0]?.data?.cols ?? [],
            settings.frame,
          ),
        readDependencies: ["frame"],
        getProps: (series) => {
          const cols = (series?.[0]?.data?.cols ?? []).filter(isCategoryCol);
          return {
            columns: cols,
            options: cols.map(({ display_name, name }) => ({
              name: display_name,
              value: name,
            })),
          };
        },
      }),
      value: defineSetting({
        id: "value",
        getSection: () => "Data",
        title: "Value column",
        widget: "field",
        getDefault: (series) =>
          findDefaultValueName(series?.[0]?.data?.cols ?? []),
        getProps: (series) => {
          const cols = (series?.[0]?.data?.cols ?? []).filter(isValueCol);
          return {
            columns: cols,
            options: cols.map(({ display_name, name }) => ({
              name: display_name,
              value: name,
            })),
          };
        },
      }),
      barsShown: defineSetting({
        id: "barsShown",
        getSection: () => "Display",
        title: "Bars shown",
        widget: "number",
        getDefault: () => 10,
        getProps: () => ({ options: { isInteger: true, isNonNegative: true } }),
      }),
      secondsPerFrame: defineSetting({
        id: "secondsPerFrame",
        getSection: () => "Display",
        title: "Seconds per frame",
        widget: "number",
        getDefault: () => 3,
        getProps: () => ({ options: { isNonNegative: true } }),
      }),
    },
    VisualizationComponent,
  });
};

export default createVisualization;
