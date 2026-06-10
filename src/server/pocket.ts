import z from "zod";
import { makePost } from "./server-post-factory";
import { makeGet } from "./server-get-factory";

const moneySchema = z.object({
  id: z.string().nonempty().max(100),
  timestamp: z.number().min(0).max(1e16),
  value: z.number().min(-1e9).max(1e9),
  note: z.string().max(1000),
  updatedAt: z.number().min(0).max(1e16),
});

const pocketSchema = z.object({
  id: z.string().nonempty().max(100),
  name: z.string().max(100),
  type: z.enum(["absolute", "change"]),
  ordering: z.number().int(),
  updatedAt: z.number().min(0).max(1e16),
  money: moneySchema.array(),
});

type Pocket = z.infer<typeof pocketSchema>;

const getPocketsFromServer = makeGet({
  item: pocketSchema,
  path: (ts) => `/api/v2/pocket/${ts}`,
});
const postPocketsToServer = makePost<Pocket>({ path: "/api/v2/customer" });

export const pocket = {
  get: getPocketsFromServer,
  post: postPocketsToServer,
};
