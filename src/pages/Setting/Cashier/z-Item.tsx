import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { DeleteBtn } from "./z-DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { memo } from "react";
import { Cashier } from "~/database/cashier/get-all";
import { auth } from "~/lib/auth-effect";
import { SelectRole } from "./z-SelectRole";
import { useUpdate } from "./use-update";
import { Show } from "~/components/Show";

const title = {
  admin: "Admin",
  user: "User",
};

export const Item = memo(function ({ cashier }: { cashier: Cashier }) {
  const username = auth.user().name;
  const { error, handleSubmit, loading, name } = useUpdate(cashier.name);
  if (username === cashier.name) {
    return (
      <div className="grid grid-cols-[1fr_140px_40px] small:grid-cols-[1fr_110px_40px] items-center">
        <p className="pl-3">{username}</p>
        <p>{title[cashier.role]}</p>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="grid grid-cols-[1fr_140px_40px] small:grid-cols-[1fr_110px_40px] items-center px-0.5 gap-3"
    >
      <div className="flex flex-col gap-1">
        <Input
          type="text"
          disabled={loading}
          value={name.value}
          onChange={(e) => name.setName(e.currentTarget.value)}
          name="name"
          aria-autocomplete="list"
        />
        <TextError>{error}</TextError>
      </div>
      <SelectRole cashier={cashier} />
      <Show when={!loading} fallback={<Spinner when={true} />}>
        <DeleteBtn name={cashier.name} />
      </Show>
    </form>
  );
});
