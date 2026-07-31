import { CashierService } from "~/services/cashier";
import { CashierItem } from "./z-Item";
import { Effect } from "effect";
import { UserService } from "~/services/user";
import { VStack } from "~/components/block/stack";

export const cashierList = Effect.gen(function* () {
  const userService = yield* UserService;
  const cashierService = yield* CashierService;
  const useUser = () => userService.useUser();
  const onUpdateName = (id: string, name: string) =>
    Effect.runPromise(
      cashierService.set.name(id, name).pipe(
        Effect.as(null),
        Effect.catchAll((e) => Effect.succeed(e.e.message)),
      ),
    );
  const onUpdateRole = (id: string, role: DBNamespace.Role) =>
    Effect.runPromise(
      cashierService.set.role(id, role).pipe(
        Effect.as(null),
        Effect.catchAll((e) => Effect.succeed(e.e.message)),
      ),
    );
  const onDelete = (id: string) =>
    Effect.runPromise(
      cashierService.delete(id).pipe(
        Effect.as(null),
        Effect.catchAll((e) => Effect.succeed(e.e.message)),
      ),
    );
  const useCashiers = () => cashierService.useCashiers();
  return function CashierList() {
    const user = useUser();
    const cashiers = useCashiers();
    return (
      <VStack className="flex flex-col gap-2">
        {cashiers.map((cashier) => (
          <CashierItem
            key={cashier.id}
            cashier={cashier}
            currentUserName={user.name}
            onUpdateName={onUpdateName}
            onUpdateRole={onUpdateRole}
            onDelete={onDelete}
          />
        ))}
      </VS>
    );
  };
});
