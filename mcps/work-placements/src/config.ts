// The server's own settings, each read through setting() (an unexpanded ${user_config.*} is not set).
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { setting } from "./settings.js";
import { PACKAGE_VERSION } from "./version.js";

/** The area searched when a search names none: a town, a region, or "lat,lon". */
export const defaultArea = (env: NodeJS.ProcessEnv = process.env): string | undefined => setting("WORK_PLACEMENTS_AREA", env);

/** The person's own Google Places API key: optional, Places is searched only with it. */
export const placesKey = (env: NodeJS.ProcessEnv = process.env): string | undefined => setting("WORK_PLACEMENTS_PLACES_KEY", env);

/** Where drafts and exports go: the setting, else Documents/work-placements (or ~/work-placements). */
export function outputDir(env: NodeJS.ProcessEnv = process.env): string {
  const set = setting("WORK_PLACEMENTS_DIR", env);
  if (set) return path.resolve(set);
  const documents = path.join(homedir(), "Documents");
  return path.join(existsSync(documents) ? documents : homedir(), "work-placements");
}

/** How the server introduces itself to the services it asks (OSM's policies ask for one). */
export const USER_AGENT = `work-placements-mcp/${PACKAGE_VERSION} (+https://github.com/falkenslab/agent-extensions/tree/main/mcps/work-placements)`;

/** The product token robots.txt groups are matched against. */
export const ROBOTS_TOKEN = "work-placements-mcp";

/** Today as YYYY-MM-DD, in local time. */
export function today(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A date YYYY-MM-DD plus some days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return today(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
}
