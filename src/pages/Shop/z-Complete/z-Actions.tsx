import { Undo2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DialogFooter } from "~/components/ui/dialog";
import { Spinner } from "~/components/Spinner";

export function Actions({
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
