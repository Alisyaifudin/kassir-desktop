import { Either } from "effect";
import { toast } from "sonner";
import type { Cashier, Role } from "~/services/cashier";
import { service } from "~/services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useMutation } from "~/components/Loader";

export function SelectRole({ cashier }: { cashier: Cashier }) {
  const { mutate } = useMutation((role: Role) => service.cashier.set.role(cashier.id, role));

  async function handleChange(role: string) {
    if (role !== "admin" && role !== "user") return;
    const result = await mutate(role);
    if (Either.isLeft(result)) toast.error(result.left.message);
  }

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
