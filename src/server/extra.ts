import z from "zod";
import { makeGet } from "./server-get-factory";
import { makePost } from "./server-post-factory";

const extraSchema = z.object({
  id: z.string().nonempty().max(100),
  name: z.string().max(100).nullable(),
  value: z.number().min(-1e9).max(1e9),
  kind: z.enum(["percent", "number"]),
  updatedAt: z.number().int().max(1e14).min(0),
});

type Extra = z.infer<typeof extraSchema>;

const getMethodsFromServer = makeGet({
  item: extraSchema,
  path: (ts) => `/api/v2/extra/${ts}`,
});

const postMethodsToServer = makePost<Extra>({ path: "/api/v2/extra" });

export const method = {
  get: getMethodsFromServer,
  post: postMethodsToServer,
};
