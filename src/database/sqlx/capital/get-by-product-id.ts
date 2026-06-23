// import { Effect } from "effect";
// import { DB } from "../instance";

// type CapitalRow = {
//   capital_id: string;
//   capital_stock: number;
//   capital_capital: number;
// };

// export function getCapitalsbyProductId(productId: string) {
//   return DB.select<CapitalRow[]>(
//     `SELECT capital_id, capital_stock, capital_capital
//        FROM capitals
//        WHERE product_id = $1 AND capital_deleted_at IS NULL`,
//     [productId],
//   ).pipe(
//     Effect.map((rows) =>
//       rows.map((r) => ({
//         id: r.capital_id,
//         stock: r.capital_stock,
//         capital: r.capital_capital,
//       })),
//     ),
//   );
// }
