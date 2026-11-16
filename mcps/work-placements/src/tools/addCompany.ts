import { z } from "zod";
import { addCompany, changeRecord } from "../record/store.js";
import { reply } from "./reply.js";
import { companyFields, companySchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerAddCompany: RegisterTool = (server) => {
  server.registerTool(
    "add_company",
    {
      title: "Add a company to the record",
      description:
        'Add a company to the person\'s local record of placement companies, as "to_contact" unless a status is given. Refused when it\'s already there (same tax id, OSM element, Places place, or name and town), naming the one it repeats: then update_company that one. From search_companies, pass its osmId or placeId; from Google Places keep only the placeId and what the person confirms. Named people are personal data: only with the person\'s yes. Writes only on this computer.',
      inputSchema: {
        ...companyFields,
        allowDuplicate: z.boolean().optional().describe("Add it even though it looks like one already there: only when the person says they're two companies"),
      },
      outputSchema: { company: companySchema },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ allowDuplicate, ...fields }) => reply({ company: changeRecord((record) => addCompany(record, fields, { allowDuplicate })) }),
  );
};
