import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { useTab } from "../use-tab";
import { revalidateTabs, useTabs } from "../use-tabs";
import { useCommit } from "./use-commit";
import { useRollback } from "./use-rollback";
import { usePrintReceipt } from "./use-print-receipt";
import { completeAtom, setComplete, useComplete } from "./use-complete";

export { setComplete };

export function useCompleteDialog() {
  const navigate = useNavigate();
  const cancelFlag = useRef(false);
  const printButtonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { open, grandTotal, change, recordId } = useComplete();
  const [tab] = useTab();
  const tabs = useTabs();
  const urlBack = useGenerateUrlBack(`/shop`);

  const commit = useCommit();
  const rollback = useRollback();
  const { loading, print: printReceipt } = usePrintReceipt();

  useEffect(() => {
    if (open) {
      setTimeout(() => printButtonRef.current?.focus(), 100);
    }
  }, [open]);

  function resetCompleteState() {
    setComplete({ open: false, grandTotal: 0, change: 0, recordId: undefined });
    cancelFlag.current = false;
    const searchbar = document.getElementById("searchbar") as HTMLInputElement | null;
    setTimeout(() => searchbar?.focus(), 300);
  }

  async function closeDialog() {
    const id = completeAtom.get().recordId;

    if (!cancelFlag.current) {
      const errMsg = await commit(tab, tabs);
      if (errMsg) {
        setError(errMsg);
        return;
      }
    } else if (id !== undefined) {
      const errMsg = await rollback(id);
      if (errMsg) {
        setError(errMsg);
        return;
      }
    }

    resetCompleteState();
    revalidateTabs();
  }

  function viewDetail() {
    if (recordId !== undefined) {
      navigate({
        pathname: `/records/${recordId}`,
        search: `url_back=${encodeURIComponent(urlBack)}`,
      });
    }
    closeDialog();
  }

  async function handlePrint() {
    if (recordId === undefined) return;
    const errMsg = await printReceipt(recordId);
    if (errMsg) {
      setError(errMsg);
    } else {
      closeDialog();
    }
  }

  function handleCancel() {
    cancelFlag.current = true;
    closeDialog();
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) closeDialog();
    else setComplete((prev) => ({ ...prev, open: true }));
  }

  return {
    open,
    grandTotal,
    change,
    recordId,
    error,
    loading,
    printButtonRef,
    handleOpenChange,
    viewDetail,
    handlePrint,
    handleCancel,
  };
}
