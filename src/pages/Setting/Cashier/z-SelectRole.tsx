import { Effect, pipe } from "effect";
import { toast } from "sonner";
import { db } from "~/database-effect";
import { Cashier } from "~/database/cashier/get-all";
import { revalidate } from "./use-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { log } from "~/lib/log";

export function SelectRole({ cashier }: { cashier: Cashier }) {
  const handleChange = async (role: string) => {
    if (role !== "admin" && role !== "user") {
      return;
    }
    const errMsg = await Effect.runPromise(program(cashier.name, role));
    if (errMsg !== null) {
      toast.error(errMsg);
    } else {
      revalidate();
    }
  };
  return (
    <Select value={cashier.role} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Peran" />
      </SelectTrigger>
      <SelectContent position="item-aligned">
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="user">User</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function program(name: string, role: DB.Role) {
  return pipe(
    db.cashier.update.role(name, role),
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
