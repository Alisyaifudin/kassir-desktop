import { Form } from "./z-Form";
import { GraveSync } from "./z-Grave";
import { ProductSync } from "./z-Product";
import { RecordSync } from "./z-Record";
import { Show } from "~/components/Show";
import { Resync } from "./z-Resync";

export function Sync({ token }: { token?: string }) {
  return (
    <div className="rounded-2xl gap-4 border bg-card p-4 shadow-sm flex-1 flex flex-col">
      <Form token={token} />
      <Show value={token}>
        {(token) => (
          <ul className="flex flex-col gap-1 outline rounded-xl p-4 h-full overflow-auto">
            <ProductSync token={token} />
            <RecordSync token={token} />
            <GraveSync token={token} />
          </ul>
        )}
      </Show>
      <Resync />
    </div>
  );
}
