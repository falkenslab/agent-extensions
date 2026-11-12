import { REQUIREMENTS } from "../requirements.js";
import { registerBuildH5p } from "./buildH5p.js";
import { registerCheckRequirements } from "./checkRequirements.js";
import { registerListH5pTypes } from "./listH5pTypes.js";
import { registerReadH5p } from "./readH5p.js";
import { registerServerInfo } from "./serverInfo.js";
import type { RegisterTool } from "./types.js";

/** Every tool, in the order clients list them. A new tool is a file in this folder, added here. */
export const TOOLS: RegisterTool[] = [registerListH5pTypes, registerBuildH5p, registerReadH5p, registerServerInfo, ...(REQUIREMENTS.length ? [registerCheckRequirements] : [])];
