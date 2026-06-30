import { Effect } from "effect";
import { CashierService } from "~/services/cashier";
import { CashierItem } from "./z-Item";

export const cashierListEffect = Effect.gen(function* () {
  const cashierService = yield* CashierService;
  const useCashiers = cashierService.cashiers.useData;
  const currentUser = cashierService.current.useUser();
  const updateName = cashierService.update.name;
  const updateRole = cashierService.update.role;
  const deleteCashier = cashierService.delete;
  return function CashierList() {
    const { data: cashiers } = useCashiers();
    return (
      <>
        {cashiers.map((cashier) => (
          <CashierItem
            key={cashier.id}
            cashier={cashier}
            currentUserName={currentUser.name}
            onUpdateName={updateName}
            onUpdateRole={updateRole}
            onDelete={deleteCashier}
          />
        ))}
      </>
    );
  };
});
