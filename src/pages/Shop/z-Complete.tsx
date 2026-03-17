import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Effect } from "effect";
import { Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { db } from "~/database";
import { log } from "~/lib/log";
import { tx } from "~/transaction";
import { TabInfo } from "~/transaction/transaction/get-all";

import { programDeleteRecord } from "../Record/z-Detail/use-delete";
import { useTab } from "./use-tab";
import { revalidateTabs, useTabs } from "./use-tabs";
import { resetStore, useMode } from "./use-transaction";
import { loadDetailRecord } from "../Record/Item/use-data";
import { Spinner } from "~/components/Spinner";
import { programPrint } from "../setting/Printer/util-program-print";

const completeAtom = createAtom({
  open: false,
  grandTotal: 0,
  change: 0,
  timestamp: undefined as number | undefined,
});

function useComplete() {
  const complete = useAtom(completeAtom);
  return complete;
}

export const setComplete = completeAtom.set;

export function Complete() {
  const navigate = useNavigate();
  const cancelFlag = useRef(false);
  const printButtonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { open, grandTotal, change, timestamp } = useComplete();
  const [tab] = useTab();
  const tabs = useTabs();
  const mode = useMode();

  useEffect(() => {
    if (open) {
      setTimeout(() => printButtonRef.current?.focus(), 100);
    }
  }, [open]);

  const resetCompleteState = () => {
    setComplete({ open: false, grandTotal: 0, change: 0, timestamp: undefined });
    cancelFlag.current = false;
    const searchbar = document.getElementById("searchbar") as HTMLInputElement | null;
    setTimeout(() => searchbar?.focus(), 300);
  };

  const handleCommit = async () => {
    resetStore(tab);
    const errMsg = await Effect.runPromise(clearTab(tab, tabs));
    if (errMsg) {
      setError(errMsg);
      return false;
    }
    return true;
  };

  const handleRollback = async (ts: number) => {
    const errMsg = await Effect.runPromise(
      Effect.gen(function* () {
        const products = yield* db.recordProduct.get.byTimestamp(ts);
        yield* programDeleteRecord(ts, mode, products);
        return null;
      }).pipe(
        Effect.catchTag("DbError", ({ e }) => {
          log.error(e);
          return Effect.succeed(e.message);
        }),
      ),
    );

    if (errMsg) {
      setError(errMsg);
      return false;
    }
    return true;
  };

  const closeDialog = async () => {
    const ts = completeAtom.get().timestamp;

    if (!cancelFlag.current) {
      if (!(await handleCommit())) return;
    } else if (ts !== undefined) {
      if (!(await handleRollback(ts))) return;
    }

    resetCompleteState();
  };

  const viewDetail = () => {
    if (timestamp !== undefined) navigate(`/records/${timestamp}`);
    closeDialog();
  };

  const printReceipt = async () => {
    if (timestamp === undefined) return;
    setLoading(true);
    const errMsg = await Effect.runPromise(
      Effect.gen(function* () {
        const data = yield* loadDetailRecord(timestamp);
        const socials = yield* db.social.getAll();
        yield* programPrint({
          record: data.record,
          products: data.products,
          extras: data.extras,
          socials,
        });
        return null;
      }).pipe(
        Effect.catchAll((e) => {
          switch (e._tag) {
            case "DbError":
              log.error(e.e);
              return Effect.fail(e.e.message);
            case "NotFound":
              return Effect.fail("Transaksi tidak ditemukan");
          }
        }),
      ),
    );
    setLoading(false);
    if (errMsg) {
      setError(errMsg);
    } else {
      closeDialog();
    }
  };

  const cancelTransaction = () => {
    cancelFlag.current = true;
    closeDialog();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) closeDialog();
        else setComplete((prev) => ({ ...prev, open: true }));
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-big font-bold mb-4 text-center w-full">
            Transaksi Berhasil
          </DialogTitle>
        </DialogHeader>

        <Summary grandTotal={grandTotal} change={change} />

        <TextError>{error}</TextError>

        <Actions
          loading={loading}
          onCancel={cancelTransaction}
          onViewDetail={viewDetail}
          onPrint={printReceipt}
          printRef={printButtonRef}
        />
      </DialogContent>
    </Dialog>
  );
}

function Summary({ grandTotal, change }: { grandTotal: number; change: number }) {
  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex justify-between items-end border-b pb-4">
        <span className="font-medium text-muted-foreground pb-2">Total</span>
        <span className="text-big font-bold leading-none">
          Rp{grandTotal.toLocaleString("id-ID")}
        </span>
      </div>
      <div className="flex justify-between items-end">
        <span className="font-medium text-muted-foreground pb-2">Kembalian</span>
        <span className="text-grand-total font-bold text-primary leading-none">
          Rp{change.toLocaleString("id-ID")}
        </span>
      </div>
    </div>
  );
}

function Actions({
  onCancel,
  onViewDetail,
  onPrint,
  printRef,
  loading,
}: {
  loading: boolean;
  onCancel: () => void;
  onViewDetail: () => void;
  onPrint: () => void;
  printRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <DialogFooter className="sm:justify-center flex sm:flex-col gap-4 pt-4">
      <div className="sm:justify-between flex flex-row gap-4 pt-4">
        <Button variant="destructive" onClick={onCancel}>
          Batalkan
          <Undo2 />
        </Button>
        <Button variant="secondary" onClick={onViewDetail}>
          Lihat Detail
        </Button>
      </div>
      <Button ref={printRef} className="flex-1 h-20" onClick={onPrint}>
        Cetak
        <Spinner when={loading} />
      </Button>
    </DialogFooter>
  );
}

function clearTab(tab: number, tabs: TabInfo[]) {
  return Effect.gen(function* () {
    yield* tx.transaction.delete(tab);
    if (tabs.length === 1) {
      yield* tx.transaction.add.new();
    }
    revalidateTabs();
    return null;
  }).pipe(
    Effect.catchTag("TooMany", (e) => {
      log.error(e.msg);
      return Effect.succeed(e.msg);
    }),
    Effect.catchTag("TxError", ({ e }) => {
      log.error(e);
      return Effect.fail(e.message);
    }),
  );
}
