import { useMemo, useState } from "react";
import { Effect, Either } from "effect";
import { toast } from "sonner";
import { useMutation } from "~/components/Loader";
import { log } from "~/lib/log";
import { service } from "~/services";
import { getDefaultInterval } from "./util-default-date-interval";
import { messageOf, saveJson } from "./util-file";
import { toRecordImport } from "./util-record-export";

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
    if (Either.isLeft(result)) {
      log.error(messageOf(result.left));
      return;
    }
    // `null` = the cashier cancelled the save dialog: silent, not "success".
    if (result.right !== null) toast.success(`Disimpan ke ${result.right}`);
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
    // The list carries no lines or extras, so each record is read in full — the
    // lines, their per-lot portions and the `product_events` row each portion
    // caused, joined in the same read. The concurrency bound stops a month's
    // export from opening a query per row.
    const full = yield* Effect.forEach(records, (record) => service.record.get.byId(record.id), {
      concurrency: 8,
    });
    return yield* saveJson(`record_${start}_${end}.json`, full.map(toRecordImport));
  });
}
