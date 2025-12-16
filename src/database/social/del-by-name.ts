import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function delById(id: number): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () => db.execute("DELETE FORM socials WHERE social_id = $1", [id]),
  });
  return errMsg;
}
