import { db } from "~/database";
import { createLoader } from "~/components/Loader-old";

export const cashiersLoader = createLoader(db.cashier.get.all());

export function revalidate() {
  void cashiersLoader.run();
}
