import { Effect, pipe } from "effect";
import { toast } from "sonner";
import { db } from "~/database-effect";
import { Cashier } from "~/database/cashier/get-all";
import { revalidate } from "~/hooks/use-micro";
import { log } from "~/lib/utils";
import { KEY } from "./loader";

export function SelectRole({ cashier }: { cashier: Cashier }) {
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.currentTarget.value;
    if (role !== "admin" && role !== "user") {
      return;
    }
    const errMsg = await Effect.runPromise(program({ role, name: cashier.name }));
    if (errMsg !== null) {
      toast.error(errMsg);
    } else {
      revalidate(KEY);
    }
  };
  return (
    <select onChange={handleChange} className="text-normal" value={cashier.role}>
      <option value="admin">Admin</option>
      <option value="user">User</option>
    </select>
  );
}

export function program({ role, name }: { role: DB.Role; name: string }) {
  return pipe(
    db.cashier.update.role(name, role),
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(JSON.stringify(e.stack));
      return Effect.succeed(e.message);
    }),
  );
}
