import { ReceiptData } from "~/lib/receipt/type";

export const mockData: Omit<ReceiptData, "info"> = {
  record: {
    cashier: "Budi",
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
      name: "Diskon",
      value: -1000,
      kind: "number",
      eff: -1000,
    },
    {
      name: "PPN",
      value: 11,
      kind: "percent",
      eff: 1000,
    },
  ],
  products: [
    {
      name: "Semangka",
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
      name: "Gorengan",
      price: 2000,
      qty: 2,
      total: 4000,
      discounts: [],
    },
    {
      name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed at congue massa, in pharetra diam.",
      price: 2000,
      qty: 2,
      total: 4000,
      discounts: [],
    },
  ],
  socials: [
    {
      name: "Shopee",
      value: "@andi",
    },
    {
      name: "Instagram",
      value: "@dewi",
    },
  ],
};
