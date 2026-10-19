import { useMemo, useState } from "react";
import { Effect, Either } from "effect";
import { useMutation } from "~/components/Loader";
import { log } from "~/lib/log";
import { service } from "~/services";
import type { RecordFull, RecordImport } from "~/services/record";
import { getDefaultInterval } from "./util-default-date-interval";
import { messageOf, saveJson } from "./util-file";

/** A record as the upload accepts it: the same shape `record.add.external` takes. */
function toRecordImport(record: RecordFull): RecordImport {
  return {
    paidAt: record.paidAt,
    rounding: record.rounding,
    isCredit: record.isCredit,
    cashier: record.cashier,
    mode: record.mode,
    pay: record.pay,
    note: record.note,
    fix: record.fix,
    customer: { name: record.customer.name, phone: record.customer.phone },
    subTotal: record.subTotal,
    total: record.total,
    methods: record.methods.map(({ methodId, pay }) => ({ methodId, pay })),
    listings: record.listings.map(
      ({ name, kind, price, qty, capital, total, discounts }) => ({
        // The line no longer carries a catalog listing id; a download restores
        // the line as a manual one (no stock movement).
        listingId: null,
        name,
        kind,
        price,
        qty,
        capital,
        total,
        discounts: discounts.map(({ kind, value, eff }) => ({ kind, value, eff })),
      }),
    ),
    extras: record.extras.map(({ name, value, eff, kind }) => ({ name, value, eff, kind })),
  };
}

export function useRecord() {
  const defaultInterval = useMemo(() => getDefaultInterval(), []);
  const [range, setRange] = useState<[number, number]>([
    defaultInterval.startOfMonth,
    defaultInterval.endOfMonth,
  ]);
  const { pending, error, mutate } = useMutation(program);

  function handleChange(start: number, end: number) {
    setRange([start, end]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await mutate({ start: range[0], end: range[1] });
    if (Either.isLeft(result)) log.error(messageOf(result.left));
  }

  return {
    range,
    setRange: handleChange,
    handleSubmit,
    loading: pending,
    error: error === null ? null : messageOf(error),
  };
}

function program({ start, end }: { start: number; end: number }) {
  return Effect.gen(function* () {
    const records = yield* service.record.get.byRange(start, end);
    // The list carries no lines or extras, so each record is read in full. The
    // concurrency bound stops a month's export from opening a query per row.
    const full = yield* Effect.forEach(records, (record) => service.record.get.byId(record.id), {
      concurrency: 8,
    });
    yield* saveJson(`record_${start}_${end}.json`, full.map(toRecordImport));
  });
}
