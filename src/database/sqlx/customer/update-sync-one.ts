// import { DB } from "../instance";
// import { Effect } from "effect";

// export function updateSyncOneCustomer(id: string, now: number) {
//   return DB.execute("UPDATE customers SET customer_sync_at = $1 WHERE customer_id = $2", [
//     now,
//     id,
//   ]).pipe(Effect.asVoid);
// }
