import { RecordFull } from "~/services/record/type";

const now = Date.now();
export const mockData: RecordFull = {
  cashier: "Budi",
  fix: 0,
  method: {
    id: "1000",
    kind: "cash",
  },
  paidAt: now,
  pay: 1300,
  rounding: 2,
  subtotal: 1000,
  total: 10002,
  id: "123456",
  createdAt: now,
  mode: "in",
  note: "nasi goreng",
  updatedAt: now,
  extras: [
    {
      id: "1",
      name: "Diskon",
      value: -1000,
      kind: "number",
      eff: -1000,
    },
    {
      id: "2",
      name: "PPN",
      value: 11,
      kind: "percent",
      eff: 1000,
    },
  ],
  products: [
    {
      id: "1",
      name: "Semangka",
      price: 1000,
      qty: 3,
      total: 3000,
      capital: 1000,
      discounts: [
        {
          id: "1",
          kind: "percent",
          value: 10,
          eff: 1000,
        },
        {
          id: "2",
          kind: "number",
          value: 1234,
          eff: 1234,
        },
        {
          id: "3",
          kind: "pcs",
          value: 1,
          eff: 1000,
        },
      ],
    },
    {
      id: "2",
      name: "Gorengan",
      capital: 100,
      price: 2000,
      qty: 2,
      total: 4000,
      discounts: [],
    },
    {
      id: "3",
      capital: 100,
      name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed at congue massa, in pharetra diam.",
      price: 2000,
      qty: 2,
      total: 4000,
      discounts: [],
    },
  ],
  // socials: [
  //   {
  //     name: "Shopee",
  //     value: "@andi",
  //   },
  //   {
  //     name: "Instagram",
  //     value: "@dewi",
  //   },
  // ],
};
