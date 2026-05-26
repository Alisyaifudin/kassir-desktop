import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const methodSchema = z.object({
  id: z.string().nonempty().max(100),
  name: z.string().max(100).nullable().optional(),
  kind: z.enum(["cash", "transfer", "debit", "qris"]),
  deletedAt: z.number().int().max(1e14).min(0).nullable().optional(),
  updatedAt: z.number().int().max(1e14).min(0).optional(),
});

export type MethodServer = z.infer<typeof methodSchema>;

export function get(timestamp: number, token: string) {
  return reqwest(genURL(`/api/method/${timestamp}`), methodSchema.array(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
