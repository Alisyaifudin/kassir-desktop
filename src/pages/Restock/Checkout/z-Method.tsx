import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { METHODS, PAYMENT } from "../mock";

/**
 * How the shop pays. The second select is the account inside the kind — the
 * named transfer target or debit card — so it is absent for cash, where there
 * is nothing to choose between.
 */
export function Method() {
  const hasSubMethods = PAYMENT.kind === "transfer" || PAYMENT.kind === "debit";
  return (
    <div className="flex flex-1 items-center gap-3">
      <Select defaultValue={PAYMENT.kind}>
        <SelectTrigger className="max-w-[240px] small:w-[165px]">
          <SelectValue placeholder="Metode" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup className="w-[200px] small:w-[150px]">
            {METHODS.map((method) => (
              <SelectItem key={method.kind} value={method.kind}>
                {method.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {hasSubMethods ? (
        <Select defaultValue="none">
          <SelectTrigger className="w-[200px] small:w-[140px]">
            <SelectValue placeholder="--Pilih--" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup className="w-[200px] small:w-[140px]">
              <SelectItem value="none">--Pilih--</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : (
        <div className="w-[200px] small:w-[140px]" />
      )}
    </div>
  );
}
