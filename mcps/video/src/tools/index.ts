import { registerCheckRequirements } from "./checkRequirements.js";
import { registerExtractFrames } from "./extractFrames.js";
import { registerGetCaptions } from "./getCaptions.js";
import { registerGetVideoInfo } from "./getVideoInfo.js";
import { registerServerInfo } from "./serverInfo.js";
import { registerTranscribeVideo } from "./transcribeVideo.js";
import { registerWriteSubtitles } from "./writeSubtitles.js";
import type { RegisterTool } from "./types.js";

/** Every tool, in the order clients list them. A new tool is a file in this folder, added here. */
export const TOOLS: RegisterTool[] = [
  registerGetVideoInfo,
  registerGetCaptions,
  registerTranscribeVideo,
  registerExtractFrames,
  registerWriteSubtitles,
  registerCheckRequirements,
  registerServerInfo,
];
