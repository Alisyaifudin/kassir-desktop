import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { useNavigate } from "react-router";
import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Undo2 } from "lucide-react";

const completeAtom = createAtom({
  open: false,
  grandTotal: 0,
  change: 0,
  timestamp: 0,
});

function useComplete() {
  const complete = useAtom(completeAtom);
  return complete;
}

export const setComplete = completeAtom.set;

export function Complete() {
  const navigate = useNavigate();
  const { open, grandTotal, change, timestamp } = useComplete();
  const printButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        printButtonRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleClose = () => {
    setComplete({
      open: false,
      grandTotal: 0,
      change: 0,
      timestamp: 0,
    });
    const searchbar = document.getElementById("searchbar") as HTMLInputElement | null;
    setTimeout(() => {
      searchbar?.focus();
    }, 300);
  };

  const handleLihat = () => {
    navigate(`/records/${timestamp}`);
    handleClose();
  };

  const handlePrint = () => {
    console.log("Mock: Printing receipt for", timestamp);
    // In real app: printReceipt(timestamp)
    alert("Mock: Print receipt success!");
  };

  const handleCancel = () => {
    console.log("Mock: Cancelling transaction", timestamp);
    // In real app: db.record.delete(timestamp)
    alert("Mock: Transaction cancelled!");
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        } else {
          setComplete((prev) => ({
            ...prev,
            open: true,
          }));
        }
      }}
    >
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-big font-bold mb-4 text-center w-full">
            Transaksi Berhasil
          </DialogTitle>
        </DialogHeader>

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

        <DialogFooter className="sm:justify-center flex sm:flex-col gap-4 pt-4">
          <div className="sm:justify-between flex flex-row gap-4 pt-4">
            <Button variant="destructive" onClick={handleCancel}>
              Batalkan
              <Undo2 />
            </Button>
            <Button variant="secondary" onClick={handleLihat}>
              Lihat Detail
            </Button>
          </div>
          <Button ref={printButtonRef} className="flex-1" onClick={handlePrint}>
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
