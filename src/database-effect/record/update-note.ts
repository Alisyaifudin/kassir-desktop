import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function updateNote(timestamp: number, note: string): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE records SET record_note = $1 WHERE timestamp = $2", [note, timestamp]),
  });
  return errMsg;
}
