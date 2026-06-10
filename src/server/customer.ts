import z from "zod";
import { makeGet } from "./server-get-factory";
import { makePost } from "./server-post-factory";

const customerSchema = z.object({
  id: z.string().nonempty().max(100),
  name: z.string().nonempty().max(100),
  phone: z.string().max(100),
  updatedAt: z.number().min(0).max(1e16),
});

type Customer = z.infer<typeof customerSchema>;

const getCustomersFromServer = makeGet({
  item: customerSchema,
  path: (ts) => `/api/v2/customer/${ts}`,
});

const postCustomersToServer = makePost<Customer>({ path: "/api/v2/customer" });

export const customer = {
  get: getCustomersFromServer,
  post: postCustomersToServer,
};
