import { UserRound } from "lucide-react";
import { useUser } from "~/hooks/use-user";
import { capitalize } from "~/lib/utils";

/**
 * Who is ringing this sale: the authenticated cashier. Read-only — switching
 * users is a login concern, not a draft setting.
 */
export function CashierName() {
  const user = useUser();
  const name = capitalize(user.name);
  return (
    <span
      className="flex min-w-0 items-center gap-1 text-small text-muted-foreground select-none"
      title={`Kasir: ${name}`}
    >
      <UserRound className="icon shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}