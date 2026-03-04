import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { X } from "lucide-react";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useState } from "react";
import { Effect, pipe } from "effect";
import { tx } from "~/transaction-effect";
import { logOld } from "~/lib/utils";
import { useSubmit } from "~/hooks/use-submit";
import { tabsStore } from "./use-tab";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";

export function DeleteSheet({ tab }: { tab: number }) {
  const [open, setOpen] = useState(false);
  const { loading, error, handleSubmit } = useSubmit(
    () => Effect.runPromise(program(tab)),
    () => {
      setOpen(false);
      tabsStore.set((tabs) => tabs.filter((t) => t.tab !== tab));
    },
  );
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild variant="ghost" className="p-0">
        <DialogTrigger>
          <X />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Hapus Sesi</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-normal">
          Hapus sesi transaksi no {tab}?
        </DialogDescription>
        <TextError>{error}</TextError>
        <DialogFooter>
          <form onSubmit={handleSubmit}>
            <Button variant="destructive">
              Hapus
              <Spinner when={loading} />
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function program(tab: number) {
  return pipe(
    tx.transaction.delete(tab),
    Effect.as(null),
    Effect.catchTag("TxError", ({ e }) => {
      logOld.error(JSON.stringify(e.stack));
      return Effect.succeed(e.message);
    }),
  );
}
