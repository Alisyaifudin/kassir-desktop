import { Effect } from "effect";
import { CashierService } from "~/services/cashier";
import { CashierItem } from "./z-Item";
import { UserService } from "~/services/user";

export const cashierListEffect = Effect.gen(function* () {
  const cashierService = yield* CashierService;
  const userService = yield* UserService;
  const useUser = () => userService.useUser();
  const useCashiers = () => cashierService.useCashiers();
  const deleteCashier = (id: string) => cashierService.delete(id);
  const updateName = (id: string, name: string) => cashierService.set.name(id, name);
  const updateRole = (id: string, role: DBNamespace.Role) => cashierService.set.role(id, role);
  return function CashierList() {
    const user = useUser();
    const cashiers = useCashiers();
    return (
      <div className="flex flex-col gap-2">
        {cashiers.map((cashier) => (
          <CashierItem
            key={cashier.id}
            cashier={cashier}
            currentUserName={user.name}
            onUpdateName={updateName}
            onUpdateRole={updateRole}
            onDelete={deleteCashier}
          />
        ))}
      </div>
    );
  };
});
