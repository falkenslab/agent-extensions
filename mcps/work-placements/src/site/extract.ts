// What a company's page says about reaching it: emails, phones, its contact, jobs and about pages, its
// social profiles, and a line on what it does. Plain HTML, read with patterns: no browser, no scripts run.

export interface PageFacts {
  title?: string;
  description?: string;
  emails: string[];
  phones: string[];
  links: { kind: "contact" | "jobs" | "about"; url: string; text?: string }[];
  social: string[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#64": "@", commat: "@", period: "." };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    const lower = code.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return ENTITIES[lower] ?? whole;
  });
}

const stripTags = (html: string) =>
  decodeEntities(
    html
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

const attribute = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(2).find((v) => v !== undefined);

function meta(html: string, ...names: string[]): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attribute(tag, "name") ?? attribute(tag, "property"))?.toLowerCase();
    if (key && names.includes(key)) {
      const content = attribute(tag, "content");
      if (content?.trim()) return decodeEntities(content).replace(/\s+/g, " ").trim();
    }
  }
  return undefined;
}

const EMAIL = /[a-z0-9][a-z0-9._%+-]*@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const NOT_EMAIL = /\.(png|jpe?g|gif|webp|svg|css|js)$|@(example|sentry|wixpress|domain)\./i;

/** Generic addresses (info@, contact@…) are the company's; others may be a person's. */
export const GENERIC_LOCAL = /^(info|informacion|information|contact|contacto|contacta|contato|kontakt|hola|hello|hi|admin|administracion|administration|office|oficina|secretaria|recepcion|reception|rrhh|hr|jobs|empleo|trabajo|careers|recruiting|talento|talent|seleccion|ventas|sales|comercial|clientes|customers|atencion|support|soporte|general|mail|correo|empresa|team|equipo|practicas|internships|formacion|training)([._+-].*)?$/i;

const LINK_KINDS: [PageFacts["links"][number]["kind"], RegExp][] = [
  ["jobs", /trabaja|work[-_ ]?with[-_ ]?us|join[-_ ]?us|[uú]nete|careers?|jobs?|empleo|vacantes|ofertas?[-_ ]de[-_ ]empleo|talent|rrhh|recursos[-_ ]humanos|pr[aá]cticas|internships?|becas|stellen|karriere|lavora/i],
  ["contact", /contact|contacto|kontakt|contatti|cont[aá]ctanos|d[oó]nde[-_ ]estamos|find[-_ ]us|location/i],
  ["about", /about|qui[eé]nes[-_ ]somos|nosotros|sobre[-_ ]nosotros|empresa|company|our[-_ ]story|historia|ueber[-_ ]uns|chi[-_ ]siamo/i],
];
const SOCIAL = /^https?:\/\/(www\.)?(linkedin\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|youtube\.com|tiktok\.com)\//i;

const PHONE_NEAR = /(?:tel[eé]?f?o?n?o?|phone|tlf|tfno|m[oó]vil|mobile|call|llama|fon)\.?\s*:?\s*((?:\+|00)?[\d][\d\s().-]{7,18}\d)/gi;

const cleanPhone = (phone: string) => phone.replace(/[^\d+]/g, "").replace(/^00/, "+");

/** Facts from one page; links are absolute and on the same site, social profiles anywhere. */
export function extractFacts(html: string, pageUrl: string): PageFacts {
  const base = new URL(pageUrl);
  const emails = new Set<string>();
  const phones = new Map<string, string>();
  const links = new Map<string, PageFacts["links"][number]>();
  const social = new Set<string>();

  for (const [, tag = "", inner = ""] of html.matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a>/gi)) {
    const href = attribute(tag, "href");
    if (!href) continue;
    const decoded = decodeEntities(href).trim();
    if (/^mailto:/i.test(decoded)) {
      const address = decodeURIComponent(decoded.slice(7).split("?")[0] ?? "").trim().toLowerCase();
      if (address.match(EMAIL)) emails.add(address);
      continue;
    }
    if (/^tel:/i.test(decoded)) {
      const raw = decodeURIComponent(decoded.slice(4)).trim();
      if (cleanPhone(raw).replace("+", "").length >= 6) phones.set(cleanPhone(raw), raw);
      continue;
    }
    let url: URL;
    try {
      url = new URL(decoded, base);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    url.hash = "";
    if (SOCIAL.test(url.href)) {
      social.add(url.href);
      continue;
    }
    if (url.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
    const text = stripTags(inner).slice(0, 80);
    const haystack = `${url.pathname} ${text}`;
    const kind = LINK_KINDS.find(([, pattern]) => pattern.test(haystack))?.[0];
    if (kind && url.pathname !== base.pathname && !links.has(url.href)) links.set(url.href, { kind, url: url.href, ...(text ? { text } : {}) });
  }

  const text = stripTags(html);
  for (const match of text.match(EMAIL) ?? []) emails.add(match.toLowerCase());
  for (const [, raw = ""] of text.matchAll(PHONE_NEAR)) {
    const digits = cleanPhone(raw);
    if (digits.replace("+", "").length >= 7 && !phones.has(digits)) phones.set(digits, raw.trim());
  }

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const description = meta(html, "description", "og:description");
  return {
    ...(title && stripTags(title) ? { title: stripTags(title) } : {}),
    ...(description ? { description: description.slice(0, 400) } : {}),
    emails: [...emails].filter((e) => !NOT_EMAIL.test(e)),
    phones: [...phones.values()],
    links: [...links.values()],
    social: [...social],
  };
}

/** The page's visible text, shortened: what the company says it does, when it has no description. */
export function pageText(html: string, max = 600): string {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  const main = body.replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, " ");
  return stripTags(main).slice(0, max);
}
