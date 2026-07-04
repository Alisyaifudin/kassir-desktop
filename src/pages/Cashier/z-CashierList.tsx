import { Cashier } from "~/services/cashier";
import { CashierItem } from "./z-Item";

type Props = {
  useUser: () => Cashier;
  useCashiers: () => Cashier[];
  onUpdateName: (id: string, name: string) => Promise<string | null>;
  onUpdateRole: (id: string, role: DBNamespace.Role) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
};

export function CashierList({ useUser, useCashiers, onDelete, onUpdateName, onUpdateRole }: Props) {
  const user = useUser();
  const cashiers = useCashiers();
  return (
    <div className="flex flex-col gap-2">
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
    </div>
  );
}
