import z from "zod";
import { makeGet } from "./server-get-factory";
import { makePost } from "./server-post-factory";

const methodSchema = z.object({
  id: z.string().nonempty().max(100),
  name: z.string().max(100).optional(),
  kind: z.enum(["cash", "transfer", "debit", "qris"]),
  updatedAt: z.number().int().max(1e14).min(0),
});

type Method = z.infer<typeof methodSchema>;

const getMethodsFromServer = makeGet({
  item: methodSchema,
  path: (ts) => `/api/v2/method/${ts}`,
});

const postMethodsToServer = makePost<Method>({ path: "/api/v2/method" });

export const method = {
  get: getMethodsFromServer,
  post: postMethodsToServer,
};
