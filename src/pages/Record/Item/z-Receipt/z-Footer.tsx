import { Show } from "~/components/Show";
import { METHOD_NAMES } from "~/lib/constants";
import type { RecordMethod } from "~/services/record";
import type { Social } from "~/services/social";

export function Footer({
  footers,
  socials,
  totalProductTypes,
  totalQty,
  methods,
  customer,
}: {
  footers: string[];
  socials: Social[];
  totalProductTypes: number;
  totalQty: number;
  methods: RecordMethod[];
  customer: { name: string; phone: string };
}) {
  const phone = "xxxxxxx" + customer.phone.slice(-5, -1);
  const methodText = methods
    .map((method) => METHOD_NAMES[method.kind] + (method.name ? ` ${method.name}` : ""))
    .join(", ");

  return (
    <>
      <div className="flex justify-between">
        <p>{totalProductTypes} Jenis/{totalQty} pcs</p>
        <p>{methodText}</p>
      </div>
      <Show when={customer.name !== "" && customer.phone !== ""}>
        <p>
          Pelanggan: {customer.name} ({phone})
        </p>
      </Show>
      <div className="flex items-center flex-col">
        {footers.map((text, index) => (
          <p className="text-center" key={index}>
            {text}
          </p>
        ))}
      </div>
      <div>
        {socials.map((social) => (
          <p key={social.id}>
            {social.name}: {social.value}
          </p>
        ))}
      </div>
    </>
  );
}
