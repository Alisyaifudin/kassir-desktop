import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function add(name: string, value: string): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("INSERT INTO socials (social_name, social_value) VALUES ($1, $2)", [name, value]),
  });
  return errMsg;
}
