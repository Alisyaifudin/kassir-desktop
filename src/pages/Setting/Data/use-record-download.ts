import { useMemo, useState } from "react";
import { getDefaultInterval } from "./util-default-date-interval";
import { Effect } from "effect";
import { db } from "~/database";
import { IOError } from "~/lib/effect-error";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { log } from "~/lib/log";
import { RecordImport } from "./RecordUpload/util-validate-record";

export function useRecord() {
  const defaultInterval = useMemo(() => {
    return getDefaultInterval();
  }, []);
  const [range, setRange] = useState<[number, number]>([
    defaultInterval.startOfMonth,
    defaultInterval.endOfMonth,
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  function handleChange(start: number, end: number) {
    setRange([start, end]);
  }
  async function handleSubmit() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(range[0], range[1]));
    setLoading(false);
    setError(errMsg);
  }
  return { range, setRange: handleChange, handleSubmit, loading, error };
}

function program(start: number, end: number) {
  return Effect.gen(function* () {
    const records = yield* fetchRecord(start, end);
    const json = JSON.stringify(records, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const data = yield* Effect.tryPromise({
      try: () => blob.bytes(),
      catch: (e) => new IOError(e),
    });
    const name = `record_${start}_${end}.json`;
    const filePath = yield* Effect.tryPromise({
      try: () =>
        save({
          title: "Simpan Data",
          defaultPath: name,
          filters: [{ name: "JSON", extensions: ["json"] }],
        }),
      catch: (e) => new IOError(e),
    });
    if (filePath === null) return null;
    yield* Effect.tryPromise({
      try: () => writeFile(filePath, data),
      catch: (e) => new IOError(e),
    });
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}

function fetchRecord(start: number, end: number) {
  return Effect.gen(function* () {
    const [rs, ps, es] = yield* Effect.all(
      [
        db.record.get.byRange(start, end),
        db.recordProduct.get.byRange(start, end),
        db.recordExtra.get.byRange(start, end),
      ],
      { concurrency: "unbounded" },
    );
    return rs.map(({ id, method, ...r }) => {
      const products = ps.filter((p) => p.recordId === id);
      const extras = es.filter((e) => e.recordId === id);
      const record: RecordImport = {
        ...r,
        methodId: method.id,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        products: products.map(({ recordId, id, discounts, ...p }) => ({
          ...p,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          discounts: discounts.map(({ id, ...d }) => d),
        })),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        extras: extras.map(({ recordId, id, ...e }) => e),
      }
      return record;
    });
  });
}
