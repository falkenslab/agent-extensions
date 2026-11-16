import { z } from "zod";
import { getCompany, readRecord } from "../record/store.js";
import { readSite } from "../site/read.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerReadCompanySite: RegisterTool = (server) => {
  server.registerTool(
    "read_company_site",
    {
      title: "Read a company's website",
      description:
        "Read a company's public website for how to reach it: its home page, then a few of its contact and \"work with us\" pages. Returns the emails found (generic ones such as info@ first; others may be a person's), phones, those pages' links, its social profiles, and a short text on what it does. Respects robots.txt and reads plain HTML without a browser, so a site built by scripts may show little: then say so and offer the address for the person to open. Only reads; to keep something, update_company with what the person confirms.",
      inputSchema: {
        url: z.string().optional().describe("The site's address (a bare domain is fine)"),
        companyId: z.number().int().optional().describe("Or a company in the record, whose website is read"),
        maxPages: z.number().int().min(1).max(5).optional().describe("Pages to read, the home page included (default 3)"),
      },
      outputSchema: {
        url: z.string().describe("The home page read, after redirects"),
        pages: z.array(z.object({ url: z.string(), read: z.boolean(), note: z.string().optional().describe("Why it wasn't read") })),
        title: z.string().optional(),
        about: z.string().optional().describe("Its own description, or the start of its home page"),
        emails: z.array(z.object({ address: z.string(), generic: z.boolean().describe("A role address (info@, rrhh@…), not a person's") })),
        phones: z.array(z.string()),
        links: z.array(z.object({ kind: z.enum(["contact", "jobs", "about"]), url: z.string(), text: z.string().optional() })),
        social: z.array(z.string()).describe("Its profiles (LinkedIn, Instagram…), for the person to open themselves"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ url, companyId, maxPages }) => {
      let site = url;
      if (!site && companyId !== undefined) {
        const company = getCompany(readRecord(), companyId);
        if (!company.website) throw new Error(`#${companyId} "${company.name}" has no website in the record; search_companies or the person may know it.`);
        site = company.website;
      }
      if (!site) throw new Error("Give the site's url, or the companyId of a company with a website.");
      return reply({ ...(await readSite(site, maxPages)) });
    },
  );
};
