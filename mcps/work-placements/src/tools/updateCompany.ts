import { z } from "zod";
import { EDITABLE_FIELDS } from "../record/model.js";
import { changeRecord, updateCompany } from "../record/store.js";
import { reply } from "./reply.js";
import { companyFields, companySchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerUpdateCompany: RegisterTool = (server) => {
  server.registerTool(
    "update_company",
    {
      title: "Update a company in the record",
      description:
        "Change a company in the record: the fields given replace those it has (people and tags replace the whole list), clear removes fields, and status moves it along (to_contact, contacted, interested, meeting, agreement, hosting, not_now, declined). Its id comes from list_companies, add_company or search_companies' inRecord. Contacts are added with log_contact, not here. Show the person what changes first. Writes only on this computer.",
      inputSchema: {
        id: z.number().int().describe("The company's id in the record"),
        ...companyFields,
        name: companyFields.name.optional(),
        clear: z.array(z.enum(EDITABLE_FIELDS)).optional().describe("Fields to remove, such as a phone that's no longer right"),
      },
      outputSchema: { company: companySchema },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, clear, ...fields }) => reply({ company: changeRecord((record) => updateCompany(record, id, fields, clear)) }),
  );
};
