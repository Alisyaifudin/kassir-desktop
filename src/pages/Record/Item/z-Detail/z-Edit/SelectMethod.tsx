import { ForEach } from "~/components/ForEach";
import { TextError } from "~/components/TextError";
import { Show } from "~/components/Show";
import { METHOD_BASE_ID, METHOD_NAMES } from "~/lib/constants";
import { MethodFull } from "~/database-effect/method/get-all";
import { useMethod } from "./use-method";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useGetMethods } from "~/hooks/use-get-methods";
import { Result } from "~/lib/result";
import { Loading } from "~/components/Loading";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

export function SelectMethod({
  method,
  close,
  timestamp,
}: {
  timestamp: number;
  method: MethodFull;
  close: () => void;
}) {
  const res = useGetMethods();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess([methods]) {
      return (
        <Wrapper
          method={method}
          timestamp={timestamp}
          close={close}
          methods={[{ id: METHOD_BASE_ID["cash"], kind: "cash" }, ...methods]}
        />
      );
    },
  });
}

function Wrapper({
  method,
  methods,
  close,
  timestamp,
}: {
  timestamp: number;
  method: MethodFull;
  methods: MethodFull[];
  close: () => void;
}) {
  const option = methods.filter((m) => m.name === undefined);
  const suboption = methods.filter((m) => m.kind === method.kind && m.name !== undefined);
  const { error, handleChangeOption, handleChangeSuboption, loading, selected } = useMethod({
    timestamp,
    methods,
    method,
    onClose: close,
  });
  return (
    <label className="grid grid-cols-[120px_1fr] items-center gap-2">
      <div className="flex items-center gap-1">
        <p>Metode</p>
      </div>
      <div className="flex items-center gap-2">
        <span>:</span>
        <Select value={selected.kind} onValueChange={handleChangeOption}>
          <SelectTrigger className="w-fit">
            <SelectValue placeholder="Metode" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <ForEach items={option}>
                {(m) => (
                  <SelectItem value={m.kind} showCheck>
                    {METHOD_NAMES[m.kind]}
                  </SelectItem>
                )}
              </ForEach>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Show when={loading}>
          <Skeleton className="w-[100px] self-stretch" />
        </Show>
        <Show when={!loading && suboption.length > 0}>
          <Select value={selected.id.toString()} onValueChange={handleChangeSuboption}>
            <SelectTrigger className="w-fit">
              <SelectValue placeholder="--Pilih--" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={METHOD_BASE_ID[method.kind].toString()} showCheck>
                  --Pilih--
                </SelectItem>
                <ForEach items={suboption}>
                  {(m) => (
                    <SelectItem value={m.id.toString()} showCheck>
                      {m.name}
                    </SelectItem>
                  )}
                </ForEach>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Show>
      </div>
      <TextError className="col-span-2">{error}</TextError>
    </label>
  );
}
