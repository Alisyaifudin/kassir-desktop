import { UserRound } from "lucide-react";
import { useUser } from "~/hooks/use-user";
import { capitalize } from "~/lib/utils";

/**
 * Who is recording this purchase: the authenticated cashier. Read-only — switching
 * users is a login concern, not a draft setting.
 */
export function CashierName() {
  const user = useUser();
  const name = capitalize(user.name);
  return (
    <span
      className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground select-none"
      title={`Kasir: ${name}`}
    >
      <UserRound className="size-5 shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}