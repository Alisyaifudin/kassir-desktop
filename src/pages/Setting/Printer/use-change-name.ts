import { Either } from "effect";
import { useState } from "react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import type { Printer } from "~/services/printer";

/**
 * Switching printer writes the whole setting, because the store holds the name
 * and the width as two keys and the service is what keeps them together.
 */
export function useChangePrinterName(printer: Printer, initial: string = printer.name) {
  const [name, setName] = useState(initial);
  const { pending, error, mutate } = useMutation(service.printer.set);

  async function handleChange(next: string) {
    const previous = name;
    setName(next);
    const either = await mutate({ ...printer, name: next });
    // The service is the source of truth, so a refused write rolls the select
    // back rather than leaving it showing a printer nothing was written to.
    if (Either.isLeft(either)) setName(previous);
  }

  return { loading: pending, name, error: error?.message ?? null, handleChange };
}
