import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

type Data = {
  productId: string;
  id: string;
};

export async function add({ id, productId }: Data): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: async () =>
      tx.execute(
        `INSERT INTO discounts (disc_id, product_id) 
         VALUES ($1, $2)`,
        [id, productId],
      ),
  });
  return errMsg;
}
