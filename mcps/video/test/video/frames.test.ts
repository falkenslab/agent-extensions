import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { frameArgs, frameName, parseShowinfo, selectExpression, spread, type FrameOptions } from "../../src/video/frames.js";

const scenes: FrameOptions = { mode: "scenes", threshold: 0.3, every: 120, minGap: 2, width: 1280 };

describe("frames", () => {
  it("select where the picture changes, never too close, and at least every so often", () => {
    assert.equal(selectExpression(scenes), "eq(n,0)+gte(t-prev_selected_t,120)+gt(scene,0.3)*gte(t-prev_selected_t,2)");
    assert.equal(selectExpression({ ...scenes, mode: "interval", every: 30 }), "eq(n,0)+gte(t-prev_selected_t,30)");
  });

  it("run ffmpeg once, scaled down, with the stretch asked for", () => {
    const args = frameArgs("in.mp4", "out/raw-%05d.jpg", { ...scenes, from: 60, to: 120 });
    assert.deepEqual(args.slice(3, 9), ["-ss", "60", "-to", "120", "-i", "in.mp4"]);
    assert.equal(args[args.indexOf("-vf") + 1], "scale='min(1280,iw)':-2,select='eq(n,0)+gte(t-prev_selected_t,120)+gt(scene,0.3)*gte(t-prev_selected_t,2)',showinfo");
    assert.equal(args.at(-1), "out/raw-%05d.jpg");
  });

  it("read each frame's time from showinfo", () => {
    const stderr = "Input #0\n[Parsed_showinfo_2 @ 0x1] n:   0 pts:      0 pts_time:0       duration:1\n[Parsed_showinfo_2 @ 0x1] n:   1 pts: 12800 pts_time:12.48   duration:1\nframe=    2 fps=0.0";
    assert.deepEqual(parseShowinfo(stderr), [0, 12.48]);
  });

  it("keep at most so many, spread over the video", () => {
    assert.deepEqual(spread(3, 5), [0, 1, 2]);
    assert.deepEqual(spread(10, 4), [0, 3, 6, 9]);
    assert.deepEqual(spread(10, 1), [0]);
  });

  it("name frames by number and time", () => {
    assert.equal(frameName(0, 62.4), "frame-001-01m02s.jpg");
    assert.equal(frameName(11, 3725), "frame-012-1h02m05s.jpg");
  });
});
