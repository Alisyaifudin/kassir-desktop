import { generateId } from "~/lib/random";

export function insertCustomer({
  customerId,
  customerName,
  customerPhone,
  now,
  bind,
}: {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  now: number;
  bind: {
    index: number;
    values: (number | string | null)[];
  };
}) {
  if (customerId !== undefined || customerName === "") return "";
  const id = generateId();
  let query = `INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, 
    customer_sync_at) 
    VALUES ($${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, 
    $${bind.index++});\n`;
  bind.values.push(id, customerName, customerPhone, now, null);
  return query;
}
