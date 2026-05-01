import { TextError } from "~/components/TextError";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useCompleteDialog } from "./use-complete-dialog";
import { Summary } from "./z-Summary";
import { Actions } from "./z-Actions";

export { setComplete } from "./use-complete-dialog";

export function Complete() {
  const {
    open,
    grandTotal,
    change,
    error,
    loading,
    printButtonRef,
    handleOpenChange,
    viewDetail,
    handlePrint,
    handleCancel,
  } = useCompleteDialog();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          onCancel={handleCancel}
          onViewDetail={viewDetail}
          onPrint={handlePrint}
          printRef={printButtonRef}
        />
      </DialogContent>
    </Dialog>
  );
}
