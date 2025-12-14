import { err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type Customer = {
  phone: string;
  name: string;
};

export async function getAll(): Promise<Result<"Aplikasi bermasalah", Customer[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () => db.select<DB.Customer[]>("SELECT * FROM customers"),
  });
  if (errMsg) return err(errMsg);
  return ok(
    res.map((r) => ({
      name: r.customer_name,
      phone: r.customer_phone,
    })),
  );
}
