import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./z-DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { memo } from "react";
import { DefaultMethod } from "./z-DefaultMethod";
import equal from "fast-deep-equal";
import { useUpdate } from "./use-update";
import { NonNullMethod } from "./use-select-default";


export const Item = memo(function Item({ method, defVal }: { method: NonNullMethod; defVal?: string }) {
  const { handleSubmit, error, loading, name } = useUpdate(method.id, method.name);
  return (
    <>
      <div className="flex items-center gap-1 p-0.5 w-full">
        <form onSubmit={handleSubmit} className="flex item-center gap-1 w-full">
          <DefaultMethod kind={method.kind} id={method.id} defVal={defVal} />
          <Input
            className="w-full"
            name="name"
            value={name.value}
            onChange={(e) => name.set(e.currentTarget.value)}
            aria-autocomplete="list"
          />
          <Spinner when={loading} />
        </form>
        <DeleteBtn method={method} />
      </div>
      <TextError>{error}</TextError>
    </>
  );
}, equal);
