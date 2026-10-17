import { Printer, Undo2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DialogClose, DialogFooter } from "~/components/ui/dialog";

/**
 * What the operator can do once the purchase is recorded.
 *
 * "Batalkan" is a real undo, not a cancel — the record exists at this point, so
 * the button has to reverse a committed purchase. It is kept on the left, away
 * from Cetak, because the two do opposite things with one mis-click between
 * them.
 */
export function Actions() {
  return (
    <DialogFooter className="flex gap-4 pt-4 sm:flex-col sm:justify-center">
      <div className="flex flex-row gap-4 pt-4 sm:justify-between">
        <Button variant="destructive">
          Batalkan
          <Undo2 className="icon" />
        </Button>
        <Button variant="secondary" asChild>
          <DialogClose type="button">Lihat Detail</DialogClose>
        </Button>
      </div>
      <Button className="h-20 flex-1">
        Cetak
        <Printer className="icon" />
      </Button>
    </DialogFooter>
  );
}
