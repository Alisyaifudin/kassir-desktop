import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { DeleteBtn } from "./z-DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { memo } from "react";
import type { Cashier } from "~/services/cashier";
import { SelectRole } from "./z-SelectRole";
import { useRename } from "./use-rename";
import { Show } from "~/components/Show";
import { useUser } from "~/hooks/use-user";

const title = {
  admin: "Admin",
  user: "User",
};

export const Item = memo(function Item({ cashier }: { cashier: Cashier }) {
  const user = useUser();
  const { error, handleSubmit, loading, name } = useRename(cashier.id, cashier.name);

  // Your own row is read-only: renaming, re-roling or deleting it from here
  // would lock you out of this page.
  if (user.id === cashier.id) {
    return (
      <div className="grid grid-cols-[1fr_140px_40px] items-center p-3 gap-3 rounded-xl bg-muted/20">
        <p className="pl-3 text-foreground font-medium">{cashier.name}</p>
        <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
          {title[cashier.role]}
        </span>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="grid grid-cols-[1fr_140px_40px] items-center gap-3 rounded-xl transition-colors hover:bg-accent/50"
    >
      <div className="flex flex-col gap-1">
        <Input
          type="text"
          disabled={loading}
          value={name.value}
          onChange={(e) => name.setName(e.currentTarget.value)}
          name="name"
          aria-autocomplete="list"
          className="bg-background border-border"
        />
        <TextError>{error}</TextError>
      </div>
      <SelectRole cashier={cashier} />
      <Show when={!loading} fallback={<Spinner when={true} />}>
        <DeleteBtn name={cashier.name} id={cashier.id} />
      </Show>
    </form>
  );
});
