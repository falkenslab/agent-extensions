// A company's public site, read as a polite crawler would: robots.txt first for every page, our own
// User-Agent, a few pages at most (the home page, then its contact and jobs pages), plain HTTP without a
// browser, so pages built by scripts show little.
import { ROBOTS_TOKEN, USER_AGENT } from "../config.js";
import { GENERIC_LOCAL, type PageFacts, extractFacts, pageText } from "./extract.js";
import { type Rule, allowed, rulesFor } from "./robots.js";

const MAX_BYTES = 2_000_000;

export interface SiteReport {
  url: string;
  pages: { url: string; read: boolean; note?: string }[];
  title?: string;
  about?: string;
  emails: { address: string; generic: boolean }[];
  phones: string[];
  links: PageFacts["links"];
  social: string[];
}

/** An http(s) URL to a public host; a bare domain gets https://. */
export function siteUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    throw new Error(`"${input}" isn't a web address.`);
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error(`Only http and https sites are read, not ${url.protocol}`);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host) || host === "::1" || /^f[cd]/.test(host))
    throw new Error(`${url.hostname} isn't a public site: only companies' public sites are read.`);
  return url;
}

class Reader {
  private robots = new Map<string, Rule[] | "unreachable">();

  private async rules(origin: string): Promise<Rule[] | "unreachable"> {
    const known = this.robots.get(origin);
    if (known) return known;
    let rules: Rule[] | "unreachable";
    try {
      const response = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) });
      if (response.ok) rules = rulesFor(await response.text(), ROBOTS_TOKEN);
      else if (response.status >= 400 && response.status < 500) rules = [];
      else rules = "unreachable";
    } catch {
      rules = "unreachable";
    }
    this.robots.set(origin, rules);
    return rules;
  }

  /** The page's HTML, following redirects, each hop checked against its site's robots.txt. */
  async page(start: URL): Promise<{ url: string; html?: string; note?: string }> {
    let url = start;
    for (let hop = 0; hop < 6; hop++) {
      const rules = await this.rules(url.origin);
      if (rules === "unreachable") return { url: url.href, note: "its robots.txt didn't answer, so the site isn't read for now" };
      if (!allowed(rules, `${url.pathname}${url.search}`)) return { url: url.href, note: "robots.txt asks robots not to read it" };
      let response: Response;
      try {
        response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      } catch (error) {
        return { url: url.href, note: `couldn't be reached (${(error as Error).message})` };
      }
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        url = siteUrl(new URL(location, url).href);
        continue;
      }
      if (!response.ok) return { url: url.href, note: `HTTP ${response.status}` };
      const type = response.headers.get("content-type") ?? "";
      if (type && !/html/i.test(type)) return { url: url.href, note: `not a web page (${type.split(";")[0]})` };
      const body = await response.arrayBuffer();
      return { url: url.href, html: new TextDecoder().decode(body.byteLength > MAX_BYTES ? body.slice(0, MAX_BYTES) : body) };
    }
    return { url: url.href, note: "too many redirects" };
  }
}

/** The home page, then up to maxPages - 1 of its contact and jobs pages. */
export async function readSite(input: string, maxPages = 3): Promise<SiteReport> {
  const reader = new Reader();
  const home = await reader.page(siteUrl(input));
  const report: SiteReport = { url: home.url, pages: [{ url: home.url, read: !!home.html, ...(home.note ? { note: home.note } : {}) }], emails: [], phones: [], links: [], social: [] };
  if (!home.html) return report;

  const facts = [extractFacts(home.html, home.url)];
  const first = facts[0];
  if (first?.title) report.title = first.title;
  report.about = first?.description ?? pageText(home.html, 400);
  const order = { contact: 0, jobs: 1, about: 2 };
  const next = [...(first?.links ?? [])].sort((a, b) => order[a.kind] - order[b.kind]).slice(0, Math.max(0, maxPages - 1));
  for (const link of next) {
    const page = await reader.page(new URL(link.url));
    report.pages.push({ url: page.url, read: !!page.html, ...(page.note ? { note: page.note } : {}) });
    if (page.html) facts.push(extractFacts(page.html, page.url));
  }

  const emails = new Set(facts.flatMap((f) => f.emails));
  report.emails = [...emails].map((address) => ({ address, generic: GENERIC_LOCAL.test(address.split("@")[0] ?? "") })).sort((a, b) => Number(b.generic) - Number(a.generic));
  report.phones = [...new Set(facts.flatMap((f) => f.phones))];
  const links = new Map(facts.flatMap((f) => f.links).map((l) => [l.url, l]));
  report.links = [...links.values()];
  report.social = [...new Set(facts.flatMap((f) => f.social))];
  return report;
}
