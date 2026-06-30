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
import { Cashier, CashierError } from "~/services/cashier";
import { Effect } from "effect";

type ItemProps = {
  cashier: Cashier;
  currentUserName: string;
  onUpdateName: (id: string, name: string) => Effect.Effect<void, CashierError>;
  onUpdateRole: (id: string, role: DBNamespace.Role) => Effect.Effect<void, CashierError>;
  onDelete: (id: string) => Effect.Effect<void, CashierError>;
};

export const CashierItem = memo(function CashierItem({
  cashier,
  currentUserName,
  onUpdateName,
  onUpdateRole,
  onDelete,
}: ItemProps) {
  const isSelf = currentUserName === cashier.name;
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<null | string>(null);
  const [name, setName] = useState(cashier.name);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nameLoading) return;
    setNameLoading(true);
    const err = await Effect.runPromise(
      onUpdateName(cashier.id, name).pipe(
        Effect.as(null),
        Effect.catchAll(({ e }) => Effect.succeed(e.message)),
      ),
    );
    setNameLoading(false);
    setNameError(err);
  }

  async function handleRoleChange(role: string) {
    if (role !== "admin" && role !== "user") return;
    await Effect.runPromise(
      onUpdateRole(cashier.id, role).pipe(Effect.catchAll(() => Effect.void)),
    );
  }

  return (
    <form
      onSubmit={handleNameSubmit}
      className="grid grid-cols-[1fr_140px_40px] small:grid-cols-[1fr_110px_40px] items-center gap-3 rounded-xl transition-colors hover:bg-accent/50"
    >
      <div className="flex flex-col gap-1">
        {isSelf ? (
          <p className="pl-3 text-foreground font-medium">{cashier.name}</p>
        ) : (
          <>
            <Input
              type="text"
              disabled={nameLoading}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              name="name"
              aria-autocomplete="list"
              className="bg-background border-border"
            />
            <TextError>{nameError}</TextError>
          </>
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
      <Show when={!nameLoading && !isSelf} fallback={<Spinner when />}>
        <DeleteDialog name={cashier.name} id={cashier.id} onDelete={onDelete} />
      </Show>
    </form>
  );
});

const DeleteDialog = memo(function DeleteDialog({
  name,
  id,
  onDelete,
}: {
  name: string;
  id: string;
  onDelete: (id: string) => Effect.Effect<void, CashierError>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const err = await Effect.runPromise(
      onDelete(id).pipe(
        Effect.as(null),
        Effect.catchAll(({ e }) => Effect.succeed(e.message)),
      ),
    );
    setLoading(false);
    setError(err);
    if (err === null) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="rounded-full p-2" type="button" asChild variant="destructive">
        <DialogTrigger>
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
