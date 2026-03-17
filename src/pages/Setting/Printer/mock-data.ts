import { ReceiptData } from "~/lib/receipt/type";

export const mockData: Omit<ReceiptData, "info"> = {
  record: {
    cashier: "Raisya",
    change: 90,
    fix: 0,
    grandTotal: 12010,
    method: {
      id: 1000,
      kind: "cash",
    },
    paidAt: Date.now(),
    pay: 1300,
    rounding: 10,
    subTotal: 10000,
    timestamp: Date.now(),
    total: 12_000_000,
  },
  extras: [
    {
      name: "Extra 1",
      value: -1000,
      kind: "number",
      eff: -1000,
    },
    {
      name: "Extra 1",
      value: 10,
      kind: "percent",
      eff: 1000,
    },
  ],
  products: [
    {
      name: "Product 1",
      price: 1000,
      qty: 3,
      total: 3000,
      discounts: [
        {
          kind: "percent",
          value: 10,
          eff: 1000,
        },
        {
          kind: "number",
          value: 1234,
          eff: 1234,
        },
        {
          kind: "pcs",
          value: 1,
          eff: 1000,
        },
      ],
    },
    {
      name: "Product 2",
      price: 2000,
      qty: 2,
      total: 4000,
      discounts: [],
    },
    {
      name: "Pilih printer yang akan digunakan untuk mencetak struk",
      price: 2000,
      qty: 2,
      total: 4000,
      discounts: [],
    },
    {
      name: "Product 4",
      price: 2000,
      qty: 2,
      total: 4000,
      discounts: [],
    },
  ],
  socials: [
    {
      name: "Facebook",
      value: "@raisya",
    },
    {
      name: "Instagram",
      value: "@raisya",
    },
  ],
};
