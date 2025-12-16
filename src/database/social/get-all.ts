import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type Social = {
  id: number;
  name: string;
  value: string;
};

export async function getAll(): Promise<Result<DefaultError, Social[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () => db.select<DB.Social[]>("SELECT * FROM socials"),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(
    res.map((r) => ({
      name: r.social_name,
      id: r.social_id,
      value: r.social_value,
    }))
  );
}
