export type WhenFinished = "loop" | "hold";

export type Settings = {
  frame?: string;
  category?: string;
  value?: string;
  barsShown?: number;
  secondsPerFrame?: number;
  whenFinished?: WhenFinished;
  showFrameLabel?: boolean;
};
