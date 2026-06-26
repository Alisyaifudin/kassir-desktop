import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { Effect } from "effect";
import { LoaderClass, SettledState, WithLoader } from "~/components/Loader";
import { Size } from "~/store/size/get";
import { Skeleton } from "~/components/ui/skeleton";
import { StoreError } from "~/store/error";
import { useCallback } from "react";

export function SelectSize({
  loader,
  setSize,
}: {
  loader: LoaderClass<Size, StoreError>;
  setSize: (size: Size) => Effect.Effect<void, StoreError>;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-semibold text-normal">Ukuran</label>
      <WithLoader loader={loader} loading={<Skeleton className="w-16 h-6 small:h-5" />}>
        {(state) => <Select state={state} setSize={setSize} />}
      </WithLoader>
    </div>
  );
}

type SelectProps = {
  state: SettledState<Size>;
  setSize: (size: Size) => Effect.Effect<void, StoreError>;
};

function Select(props: SelectProps) {
  const { size, loading, error, handleChange } = useChange(props);
  return (
    <>
      <select
        value={size}
        disabled={loading}
        className="p-1 outline text-normal"
        onChange={handleChange}
      >
        <option value="small">Kecil</option>
        <option value="big">Besar</option>
      </select>
      <Spinner when={loading} />
      <TextError>{error}</TextError>
    </>
  );
}

function useChange({ state, setSize }: SelectProps) {
  const size = state.useData();
  const loading = state.useLoading();
  const [error, setError] = state.useError<string>();
  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (loading) return;
      const newSize = e.currentTarget.value;
      if (newSize !== "big" && newSize !== "small") return;
      state.setData(newSize); // optimistic update
      state.setLoading(true);
      const error = await Effect.runPromise(
        setSize(newSize).pipe(
          Effect.as(null),
          Effect.catchAll((e) => Effect.succeed(e)),
        ),
      );
      state.setLoading(false);
      if (error === null) return;
      state.setData(size); // undo optimistic update
      setError(error.e.message);
    },
    [loading, setSize, size, state, setError],
  );
  return { size, loading, error, handleChange };
}
