import { useCallback, useState } from "react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { FieldHeader } from "./z-FieldHeader";
import z from "zod";

const widthSchema = z
  .string()
  .nonempty("Harus ada")
  .transform((v) => Number(v))
  .refine((v) => !Number.isNaN(v), "Harus angka")
  .refine((v) => Number.isFinite(v), "Harus terbatas")
  .refine((v) => v > 10, "Minimal 10mm")
  .refine((v) => v < 200, "Maksimal 200mm");

type Props = {
  size: number;
  onSetSize: (size: number) => Promise<string | null>;
};

export function PrinterWidth({ size, onSetSize }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
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
      const err = await onSetSize(width);
      setLoading(false);
      setError(err);
    },
    [loading, onSetSize],
  );

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
}
