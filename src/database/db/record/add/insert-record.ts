export function insertRecord({
  recordId,
  now,
  rounding,
  isCredit,
  cashier,
  mode,
  pay,
  note,
  methodId,
  fix,
  customerName,
  customerPhone,
  subtotal,
  total,
  bind,
}: {
  recordId: string;
  now: number;
  rounding: number;
  isCredit: boolean;
  cashier: string;
  mode: DB.Mode;
  pay: number;
  note: string;
  methodId: string;
  fix: number;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  total: number;
  bind: {
    index: number;
    values: (number | string | null)[];
  };
}) {
  let query = `INSERT INTO records (record_id, record_paid_at, record_rounding, record_is_credit, 
    record_cashier, record_mode, record_pay, record_note, method_id, record_fix, record_customer_name, 
    record_customer_phone, record_sub_total, record_total, record_updated_at, record_sync_at)
    VALUES ($${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, 
    $${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, 
    $${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, 
    $${bind.index++}, $${bind.index++});\n`;
  bind.values.push(
    recordId,
    now,
    rounding,
    isCredit ? 1 : 0,
    cashier,
    mode,
    pay,
    note,
    methodId,
    fix,
    customerName,
    customerPhone,
    subtotal,
    total,
    now,
    null,
  );
  return query;
}
