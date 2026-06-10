// import { DB } from "../instance";
// import { Effect } from "effect";

// export function getCustomerLastSyncAt() {
//   return DB.select<{ timestamp: number }[]>(
//     `SELECT MAX(customer_sync_at) AS timestamp FROM customers`,
//   ).pipe(Effect.map((res) => (res.length === 0 ? 0 : res[0].timestamp)));
// }
