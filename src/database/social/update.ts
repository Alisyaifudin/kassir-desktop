import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function update(
  id: number,
  name: string,
  value: string
): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE socials SET social_name = $1, social_value = $2 WHERE social_id = $3", [
        name,
        value,
        id,
      ]),
  });
  return errMsg;
}
