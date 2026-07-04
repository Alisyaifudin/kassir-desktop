import { Customer } from "~/services/customer/type";
import { CustomerItem } from "./z-Item";

type Props = {
  useCustomers: () => Customer[];
  onUpdate: (id: string, name: string, phone: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
};

export function CustomerList({ useCustomers, onUpdate, onDelete }: Props) {
  const customers = useCustomers();
  return (
    <div className="flex flex-col gap-3">
      {customers.map((customer) => (
        <CustomerItem
          key={customer.id}
          customer={customer}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
