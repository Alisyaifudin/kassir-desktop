import { forwardRef } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import type { RecordFull } from "~/services/record";

const title = { outcoming: "Beli", incoming: "Jual" } as const;

type Props = {
  record: RecordFull;
  loading: boolean;
  error: string | null;
  print: () => void;
};

export const Top = forwardRef<HTMLButtonElement, Props>(function Top(
  { record, print, loading, error },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="font-bold px-2 rounded-md text-3xl">{title[record.mode]}</h2>
          {record.mode === "outcoming" ? (
            record.isCredit ? (
              <p className="text-2xl text-red-500">: Kredit</p>
            ) : (
              <p className="text-2xl text-emerald-500">: Lunas</p>
            )
          ) : null}
        </div>
        <Button ref={ref} onClick={print} disabled={loading}>
          Cetak <Spinner when={loading} />
        </Button>
      </div>
      <TextError>{error}</TextError>
    </div>
  );
});
