import { Show } from "~/components/Show";
import { Method } from "~/database/method/get-all";
import { Social } from "~/database/social/get-all";
import { METHOD_NAMES } from "~/lib/utils";

export function Footer({
  footers,
  socials,
  totalProductTypes,
  totalQty,
  method,
  customer,
}: {
  footers: string[];
  socials: Social[];
  totalProductTypes: number;
  totalQty: number;
  method: Method;
  customer: { name: string; phone: string };
}) {
  const phone = "xxxxxxx" + customer.phone.slice(-5, -1);
  return (
    <>
      <div className="flex justify-between">
        <p>
          {totalProductTypes} Jenis/{totalQty} pcs
        </p>
        <p className="">
          {METHOD_NAMES[method.kind]}
          {method.name === undefined ? null : " " + method.name}
        </p>
      </div>
      <Show when={customer.name !== "" && customer.phone !== ""}>
        <p>
          Pelanggan: {customer.name} ({phone})
        </p>
      </Show>
      <div className="flex items-center flex-col">
        {footers.map((h, i) => (
          <p className="text-center" key={i}>
            {h}
          </p>
        ))}
        {socials.map((s) => (
          <p key={s.id}>
            {s.name}: {s.value}
          </p>
        ))}
      </div>
    </>
  );
}
