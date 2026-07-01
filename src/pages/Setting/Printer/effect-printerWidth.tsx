import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Effect } from "effect";
import { PrinterService } from "~/services/print";
import z from "zod";
import { useCallback, useState } from "react";
import { FieldHeader } from "./z-FieldHeader";

const widthSchema = z
  .string()
  .nonempty("Harus ada")
  .transform((v) => Number(v))
  .refine((v) => !Number.isNaN(v), "Harus angka")
  .refine((v) => Number.isFinite(v), "Harus terbatas")
  .refine((v) => v > 10, "Minimal 10mm")
  .refine((v) => v < 200, "Maksimal 200mm");

export const printerWidth = Effect.gen(function* () {
  const printerService = yield* PrinterService;
  const useSize = printerService.size.useSize;
  return function PrinterWidth() {
    const size = useSize();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (loading) return;
      const formdata = new FormData(e.currentTarget);
      const parsed = widthSchema.safeParse(formdata.get("width"));
      if (!parsed.success) {
        setError(parsed.error.message);
        return;
      }
      const width = parsed.data;
      setLoading(true);
      const error = await printerService.size.set(width);
      setLoading(false);
      setError(error);
    }, [loading]);
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-1">
        <FieldHeader
          id="receipt-width"
          label="Lebar Struk (mm)"
          loading={loading}
          description="Atur lebar kertas struk untuk printer thermal"
        />
        <Input
          name="width"
          type="number"
          required
          defaultValue={size}
          min={1}
          max={500}
          className="bg-background border-border mt-1"
        />
        <TextError>{error}</TextError>
        <Button type="submit" disabled={loading} className="mt-2 w-fit">
          Simpan
          <Spinner when={loading} />
        </Button>
      </form>
    );
  };
});
