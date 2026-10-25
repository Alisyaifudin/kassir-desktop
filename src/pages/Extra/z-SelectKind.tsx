import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useFieldContext } from "./util-extra-options";
import { FieldLabel } from "~/components/ui/field";
import { useStore } from "@tanstack/react-form";

export function SelectKind() {
  const field = useFieldContext<string>();
  const isSubmitting = useStore(field.form.store, (state) => state.isSubmitting);
  return (
    <div className="grid grid-cols-[150px_1fr] small:grid-cols-[100px_1fr] items-center">
      <FieldLabel htmlFor="kind-select">Jenis</FieldLabel>
      <Select value={field.state.value} onValueChange={field.handleChange}>
        <SelectTrigger id="kind-select" disabled={isSubmitting} className="w-[180px]">
          <SelectValue placeholder="Jenis" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="number">Angka</SelectItem>
            <SelectItem value="percent">Persen</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
