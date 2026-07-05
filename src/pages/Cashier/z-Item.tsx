import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { X } from "lucide-react";
import { memo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Show } from "~/components/Show";
import { Cashier } from "~/services/cashier";
import z from "zod";

type ItemProps = {
  cashier: Cashier;
  currentUserName: string;
  onUpdateName: (id: string, name: string) => Promise<string | null>;
  onUpdateRole: (id: string, role: DBNamespace.Role) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
};

export function CashierItem({
  cashier,
  currentUserName,
  onUpdateName,
  onUpdateRole,
  onDelete,
}: ItemProps) {
  const isSelf = currentUserName === cashier.name;
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);

  async function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const formdata = new FormData(e.currentTarget);
    const parsed = z.string().nonempty("Harus ada").safeParse(formdata.get("name"));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Harus diisi");
      return;
    }
    const name = parsed.data;
    setLoading(true);
    const error = await onUpdateName(cashier.id, name);
    setLoading(false);
    setError(error);
  }

  async function handleRoleChange(role: string) {
    if (role !== "admin" && role !== "user") return;
    if (loading) return;
    setLoading(true);
    const error = await onUpdateRole(cashier.id, role);
    setLoading(false);
    setError(error);
  }

  return (
    <div className="flex flex-col gap-1">
      <form
        onSubmit={handleNameSubmit}
        className="grid grid-cols-[1fr_140px_40px] small:grid-cols-[1fr_110px_40px] items-center gap-3 rounded-xl transition-colors hover:bg-accent/50"
      >
        <div className="flex flex-col gap-1">
          {isSelf ? (
            <p className="pl-3 text-foreground font-medium">{cashier.name}</p>
          ) : (
            <Input
              type="text"
              disabled={loading}
              defaultValue={cashier.name}
              name="name"
              aria-autocomplete="list"
              className="bg-background border-border"
            />
          )}
        </div>
        <Select value={cashier.role} onValueChange={handleRoleChange} disabled={isSelf}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Peran" />
          </SelectTrigger>
          <SelectContent position="item-aligned">
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Show when={!loading && !isSelf} fallback={<Spinner when />}>
          <DeleteDialog
            name={cashier.name}
            id={cashier.id}
            onDelete={onDelete}
            isLoading={loading}
          />
        </Show>
      </form>
      <TextError>{error}</TextError>
    </div>
  );
}

const DeleteDialog = memo(function DeleteDialog({
  name,
  id,
  onDelete,
  isLoading,
}: {
  name: string;
  id: string;
  onDelete: (id: string) => Promise<string | null>;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || isLoading) return;
    setLoading(true);
    const err = await onDelete(id);
    setLoading(false);
    setError(err);
    if (err === null) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="rounded-full p-2" type="button" asChild variant="destructive">
        <DialogTrigger disabled={loading || isLoading}>
          <X />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Yakin?</DialogTitle>
          <DialogDescription>Kamu akan menghapus:</DialogDescription>
          <DialogDescription>&gt;{name}</DialogDescription>
          <form onSubmit={handleSubmit} className="flex justify-between mt-5">
            <Button asChild>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button type="submit" variant="destructive">
              Hapus
              <Spinner when={loading} />
            </Button>
          </form>
          <TextError>{error}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
