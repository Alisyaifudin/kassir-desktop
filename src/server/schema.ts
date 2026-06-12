import z from "zod";

export const deletedSchema = z.object({
  id: z.string().nonempty().max(100),
  deletedAt: z.number().min(0).max(1e16),
});
export type Deleted = z.infer<typeof deletedSchema>;
