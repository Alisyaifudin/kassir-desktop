import { Form } from "./z-Form";
import { UnifiedSync } from "./z-UnifiedSync";
import { Show } from "~/components/Show";

export function Sync({ token }: { token?: string }) {
  return (
    <div className="rounded-2xl gap-4 border bg-card p-4 shadow-sm flex-1 flex flex-col">
      <Form token={token} />
      <Show value={token}>
        {(token) => <UnifiedSync token={token} />}
      </Show>
    </div>
  );
}
