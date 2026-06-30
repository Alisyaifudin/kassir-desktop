import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/Spinner";

export function FieldHeader({
  id,
  label,
  loading,
  description,
}: {
  id: string;
  label: string;
  loading: boolean;
  description: string;
}) {
  return (
    <>
      <div className="flex gap-2">
        <Label htmlFor={id} className="text-normal font-semibold">
          {label}
        </Label>
        <Spinner when={loading} />
      </div>
      <p className="text-muted-foreground text-small">{description}</p>
    </>
  );
}
