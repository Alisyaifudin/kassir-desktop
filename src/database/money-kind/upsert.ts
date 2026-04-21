// import { Effect } from "effect";
// import { DB } from "../instance";

// export function upsert({
//   id,
//   name,
//   type,
//   updatedAt,
// }: {
//   id: string;
//   name: string;
//   type: DB.MoneyType;
//   updatedAt: number;
// }) {
//   const now = Date.now();
//   return DB.try((db) =>
//     db.execute(
//       `INSERT INTO money_kind (money_kind_id, money_kind_name, money_kind_type, 
//        money_kind_updated_at, money_kind_sync_at) VALUES ($1, $2, $3, $4, $5)
//        ON CONFLICT (money_kind_id) DO UPDATE SET
//        money_kind_name = excluded.money_kind_name,
//        money_kind_type = excluded.money_kind_type,
//        money_kind_updated_at = excluded.money_kind_updated_at,
//        money_kind_sync_at = excluded.money_kind_sync_at
//       `,
//       [id, name, type, updatedAt, now],
//     ),
//   ).pipe(Effect.asVoid);
// }
