import { useUpdateName } from "./use-update-name";
import { Spinner } from "~/components/Spinner";

export function Name({ name: init, kindId }: { kindId: string; name: string }) {
  const { name, setName, handleSubmit, loading } = useUpdateName(kindId, init);
  return (
    <form className="flex-1 flex items-center" onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        className="text-big focus:outline-none border-0 min-h-17 small:min-h-12 w-full"
      />
      <Spinner when={loading} />
    </form>
  );
}
