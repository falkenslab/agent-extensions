import { registerAskerInputReference } from "./askerInputReference.js";
import { registerCheckInput } from "./checkInput.js";
import { registerCheckRequirements } from "./checkRequirements.js";
import { registerExcludeQuestions } from "./excludeQuestions.js";
import { registerGenerateQuestions } from "./generateQuestions.js";
import { registerReadQuestions } from "./readQuestions.js";
import { registerServerInfo } from "./serverInfo.js";
import type { RegisterTool } from "./types.js";

/** Every tool, in the order clients list them. A new tool is a file in this folder, added here. */
export const TOOLS: RegisterTool[] = [
  registerAskerInputReference,
  registerCheckInput,
  registerGenerateQuestions,
  registerReadQuestions,
  registerExcludeQuestions,
  registerCheckRequirements,
  registerServerInfo,
];
