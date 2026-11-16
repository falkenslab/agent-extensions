/**
 * The server's usage rules, sent in the MCP `instructions` field so every client reads them.
 * Generic: no client, agent, institution or country is named here.
 */
export const INSTRUCTIONS = `- This server helps a teacher find, contact and follow the companies where their students do work placements. It keeps one local record on this computer and sends nothing: no email, no form, no message.
- Tools annotated read-only only read (search_companies, read_company_site, list_companies, pipeline_summary, server_info). The others write only on this computer (the record, drafts, exports): say what they'll write and get the person's yes first.
- Look in the record first (list_companies) before searching; search_companies marks what's already there (inRecord) and add_company refuses duplicates.
- OpenStreetMap's data is © OpenStreetMap contributors (ODbL): cite it when you show or keep it. From Google Places keep only the placeId, plus what the person confirms or the company's own site says.
- read_company_site respects robots.txt and reads plain HTML without a browser; never try to get around a refusal.
- draft_emails writes one draft per company from the person's own template, to the company's generic address; the person reviews and sends each one, then log_contact notes it.
- Named people at companies are personal data: keep only what's needed, with the person's yes.`;
