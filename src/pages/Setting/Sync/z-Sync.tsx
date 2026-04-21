import { Form } from "./z-Form";
import { ProductSync } from "./z-Product";
import { Show } from "~/components/Show";

export function Sync({ token }: { token?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm flex-1 flex flex-col">
      <Form token={token} />

      <Show value={token}>
        {(token) => (
          <ul className="flex flex-col gap-1 bg-black rounded-xl p-4 h-full overflow-auto">
            <ProductSync token={token} />
          </ul>
        )}
      </Show>
    </div>
  );
}
