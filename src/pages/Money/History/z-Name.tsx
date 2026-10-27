import { useUpdateName } from "./use-update-name";
import { Spinner } from "~/components/Spinner";

export function Name({ name: init, pocketId }: { pocketId: string; name: string }) {
  const { name, setName, handleSubmit, loading } = useUpdateName(pocketId, init);
  return (
    <form className="flex-1 flex items-center" onSubmit={handleSubmit}>
      <input
        // Edge's WebView2 suggests as you type and `autocomplete="off"` does not
        // stop it; declaring `aria-autocomplete` keeps it out of the field. See
        // `~/components/ui/input.tsx` — this is the one text field that does not
        // go through `Input`.
        aria-autocomplete="list"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        className="text-2xl focus:outline-none border-0 min-h-17 w-full"
      />
      <Spinner when={loading} />
    </form>
  );
}
