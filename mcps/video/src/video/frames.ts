// Frames with ffmpeg, in one pass: where the picture changes (a new slide, a different window, code being
// written) or at a fixed interval, as JPEG files, with the time of each read from ffmpeg's showinfo.

export type FrameMode = "scenes" | "interval";

export interface FrameOptions {
  mode: FrameMode;
  /** scenes: how different a frame must be from the one before, 0 to 1. */
  threshold: number;
  /** interval: seconds between frames; scenes: the longest stretch without one. */
  every: number;
  /** scenes: the shortest stretch between two frames, so a transition doesn't give a burst of them. */
  minGap: number;
  /** The frames' width, in pixels (never wider than the video). */
  width: number;
  from?: number;
  to?: number;
}

/** ffmpeg's select expression for these options. */
export function selectExpression(options: FrameOptions): string {
  const since = "t-prev_selected_t";
  if (options.mode === "interval") return `eq(n,0)+gte(${since},${options.every})`;
  return `eq(n,0)+gte(${since},${options.every})+gt(scene,${options.threshold})*gte(${since},${options.minGap})`;
}

/** ffmpeg's arguments to write the frames as <pattern> (frame-%05d.jpg). */
export function frameArgs(input: string, pattern: string, options: FrameOptions): string[] {
  const filters = [`scale='min(${options.width},iw)':-2`, `select='${selectExpression(options)}'`, "showinfo"].join(",");
  return [
    "-hide_banner",
    "-nostats",
    "-y",
    ...(options.from !== undefined ? ["-ss", String(options.from)] : []),
    ...(options.to !== undefined ? ["-to", String(options.to)] : []),
    "-i",
    input,
    "-an",
    "-sn",
    "-dn",
    "-vf",
    filters,
    "-fps_mode",
    "vfr",
    "-q:v",
    "3",
    pattern,
  ];
}

/** The time of each frame ffmpeg wrote, in order, from showinfo's lines. */
export function parseShowinfo(stderr: string): number[] {
  const times: number[] = [];
  for (const line of stderr.split(/\r?\n/)) {
    if (!/Parsed_showinfo/.test(line)) continue;
    const time = /pts_time:\s*(-?[\d.]+(?:e[-+]?\d+)?)/.exec(line)?.[1];
    if (time !== undefined) times.push(Number(time));
  }
  return times;
}

/** Which of `count` frames to keep so there are at most `max`, spread evenly, the first always kept. */
export function spread(count: number, max: number): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  if (max <= 1) return [0];
  const keep = new Set<number>();
  for (let i = 0; i < max; i++) keep.add(Math.round((i * (count - 1)) / (max - 1)));
  return [...keep].sort((a, b) => a - b);
}

/** A frame's file name: its number and its time, frame-003-01m02s.jpg. */
export function frameName(index: number, seconds: number): string {
  const total = Math.floor(seconds);
  const [h, m, s] = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  const two = (n: number) => String(n).padStart(2, "0");
  return `frame-${String(index + 1).padStart(3, "0")}-${h ? `${h}h` : ""}${two(m)}m${two(s)}s.jpg`;
}
