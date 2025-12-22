import { TextError } from "~/components/TextError";
import { cn } from "~/lib/utils";
import { css } from "./style.css";
import { Size } from "~/store/size/get";

export function Field({
  error,
  children,
  label,
  size,
}: {
  error?: string;
  children: React.ReactNode;
  label: string;
  size: Size;
}) {
  return (
    <label className="flex flex-col w-full">
      <div className={cn("grid gap-2 items-center", css.grid[size])}>
        <span className="text-normal">{label}</span>
        {children}
      </div>
      {error === undefined ? null : (
        <div className={cn("grid gap-2 items-center", css.grid[size])}>
          <div />
          <TextError>{error}</TextError>
        </div>
      )}
    </label>
  );
}
