import { Temporal } from "temporal-polyfill";
import { Database } from "~/database/old";
import { constructCSV, err, log, ok, Result, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function productAction({
  context,
}: SubAction): Promise<Result<string, { name: string; csv: string }>> {
  const { db } = getContext(context);
  const [errMsg, csv] = await getCSV(db);
  if (errMsg !== null) {
    return err(errMsg);
  }
  const today = Temporal.Now.instant();
  const name = `products_${today.epochMilliseconds}.csv`;
  return ok({ name, csv });
}

async function getCSV(db: Database): Promise<Result<string, string>> {
  const [errMsg, products] = await db.product.get.all();
  if (errMsg !== null) {
    log.error(errMsg);
    return err(errMsg);
  }
  const csv = constructCSV(products);
  return ok(csv);
}
