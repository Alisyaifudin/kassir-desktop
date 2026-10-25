import { useEffect, useState } from "react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import type { Printer } from "~/services/printer";

/** The paper width in mm, kept in step with the printer it belongs to. */
export function useChangePrinterWidth(printer: Printer) {
  const [width, setWidth] = useState(printer.width);
  const { pending, error, mutate } = useMutation(service.printer.set);

  // A width written elsewhere (or restored on boot) is the one to show.
  useEffect(() => {
    setWidth(printer.width);
  }, [printer.width]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || width < 1) return;
    await mutate({ ...printer, width });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(e.currentTarget.value);
    if (!Number.isFinite(next)) return;
    setWidth(next);
  }

  return { width, loading: pending, error: error?.message ?? null, handleSubmit, handleChange };
}
