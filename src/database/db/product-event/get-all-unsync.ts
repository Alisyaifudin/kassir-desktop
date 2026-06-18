import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";

export function getAllUnsyncProductEvent() {
  return sqlx.productEvent.get.allUnsync().pipe(
    Effect.map((events) => {
      const map = new Map<
        string,
        {
          id: string;
          value: number;
          type: DB.ProductEventEnum;
          timestamp: number;
        }[]
      >();
      for (const event of events) {
        const item = map.get(event.capitalId);
        const val = {
          id: event.id,
          value: event.value,
          type: event.type,
          timestamp: event.timestamp,
        };
        if (item === undefined) {
          map.set(event.capitalId, [val]);
        } else {
          item.push(val);
        }
      }
      return map;
    }),
  );
}
