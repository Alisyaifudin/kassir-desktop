import z from "zod";
import { makePost } from "./server-post-factory";
import { makeGet } from "./server-get-factory";
import { Deleted, deletedSchema } from "./schema";

const moneySchema = z.object({
  id: z.string().nonempty().max(100),
  timestamp: z.number().min(0).max(1e16),
  value: z.number().min(-1e9).max(1e9),
  note: z.string().max(1000),
  updatedAt: z.number().min(0).max(1e16),
});

export type Money = z.infer<typeof moneySchema>;

const pocketSchema = z.object({
  id: z.string().nonempty().max(100),
  name: z.string().nonempty().max(100),
  type: z.enum(["absolute", "change"]),
  ordering: z.number().min(0).max(1e16),
  updatedAt: z.number().min(0).max(1e16),
  money: moneySchema.array(),
});

const deletedPocketSchema = z.object({
  pocket: deletedSchema.array(),
  money: deletedSchema.array(),
});

export type Pocket = z.infer<typeof pocketSchema>;
export type PocketDeleted = z.infer<typeof deletedPocketSchema>;

const getPocketsFromServer = makeGet({
  item: pocketSchema,
  deleted: deletedPocketSchema,
  path: (ts) => `/api/v2/pocket/${ts}`,
});
const postPocketsToServer = makePost<Pocket, { pocket: Deleted[]; money: Deleted[] }>({
  path: "/api/v2/customer",
});

export const pocket = {
  get: getPocketsFromServer,
  post: postPocketsToServer,
};
