// What the tests share: an in-memory client, a fresh data folder, and a fake fetch (no test goes online).
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/createServer.js";

export async function connect(): Promise<Client> {
  const server = createServer();
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/** A new, empty data folder and output folder for the record, drafts and exports; the settings cleared. */
export function freshFolders(): { data: string; output: string } {
  const root = mkdtempSync(path.join(tmpdir(), "work-placements-"));
  const folders = { data: path.join(root, "data"), output: path.join(root, "output") };
  process.env.CLAUDE_PLUGIN_DATA = folders.data;
  process.env.WORK_PLACEMENTS_DIR = folders.output;
  delete process.env.WORK_PLACEMENTS_AREA;
  delete process.env.WORK_PLACEMENTS_PLACES_KEY;
  return folders;
}

export type Route = (url: URL, init: RequestInit | undefined) => Response | Promise<Response>;

/** Replaces fetch with routes by URL prefix; an unknown URL fails the test. Returns the calls made. */
export function fakeFetch(routes: Record<string, Route>): { calls: { url: string; init?: RequestInit }[]; restore: () => void } {
  const original = globalThis.fetch;
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    calls.push({ url: url.href, ...(init ? { init } : {}) });
    const prefix = Object.keys(routes)
      .filter((p) => url.href.startsWith(p))
      .sort((a, b) => b.length - a.length)[0];
    if (!prefix) throw new Error(`No fake route for ${url.href}`);
    return routes[prefix]?.(url, init) as Response;
  }) as typeof fetch;
  return { calls, restore: () => void (globalThis.fetch = original) };
}

export const html = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
export const text = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/plain" } });

/** A tool's structured result. */
export const structured = <T>(result: unknown) => (result as { structuredContent: T }).structuredContent;
/** A tool's text, for errors. */
export const textOf = (result: unknown) => ((result as { content: { text: string }[] }).content[0]?.text ?? "");
