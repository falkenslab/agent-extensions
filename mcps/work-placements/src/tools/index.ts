import { REQUIREMENTS } from "../requirements.js";
import { registerAddCompany } from "./addCompany.js";
import { registerCheckRequirements } from "./checkRequirements.js";
import { registerDraftEmails } from "./draftEmails.js";
import { registerExportCompanies } from "./exportCompanies.js";
import { registerImportCompanies } from "./importCompanies.js";
import { registerListCompanies } from "./listCompanies.js";
import { registerLogContact } from "./logContact.js";
import { registerPipelineSummary } from "./pipelineSummary.js";
import { registerReadCompanySite } from "./readCompanySite.js";
import { registerSearchCompanies } from "./searchCompanies.js";
import { registerServerInfo } from "./serverInfo.js";
import { registerUpdateCompany } from "./updateCompany.js";
import type { RegisterTool } from "./types.js";

/** Every tool, in the order clients list them. A new tool is a file in this folder, added here. */
export const TOOLS: RegisterTool[] = [
  registerSearchCompanies,
  registerReadCompanySite,
  registerAddCompany,
  registerUpdateCompany,
  registerLogContact,
  registerListCompanies,
  registerPipelineSummary,
  registerImportCompanies,
  registerExportCompanies,
  registerDraftEmails,
  registerServerInfo,
  // Only when the server needs a program installed apart: none in this version (no browser yet).
  ...(REQUIREMENTS.length ? [registerCheckRequirements] : []),
];
