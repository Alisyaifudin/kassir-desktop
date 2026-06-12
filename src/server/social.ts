import z from "zod";
import { makeGet } from "./server-get-factory";
import { makePost } from "./server-post-factory";
import { deletedSchema } from "./schema";

const socialSchema = z.object({
  id: z.string().nonempty().max(100),
  name: z.string().nonempty().max(100),
  value: z.string().max(100),
  updatedAt: z.number().int().max(1e14).min(0),
});

type Social = z.infer<typeof socialSchema>;

const getSocialsFromServer = makeGet({
  item: socialSchema,
  deleted: deletedSchema.array(),
  path: (ts) => `/api/v2/social/${ts}`,
});

const postSocialsToServer = makePost<Social>({ path: "/api/v2/social" });

export const social = {
  get: getSocialsFromServer,
  post: postSocialsToServer,
};
