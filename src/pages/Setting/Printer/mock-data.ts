import { ReceiptData } from "~/lib/receipt/type";
import type { DiscountKind } from "~/services/record";

const discount = (kind: DiscountKind, value: number, eff: number) => ({
  id: `mock-${kind}-${value}`,
  kind,
  value,
  eff,
});

/**
 * A receipt with something of everything on it — odd quantities, all three
 * discount kinds, extras in both directions, a rounding step — so a test print
 * exercises every branch of the layout.
 */
export const mockData: Omit<ReceiptData, "info"> = {
  record: {
    id: "123456",
    createdAt: 0,
    date: 0,
    paidAt: 0,
    creditAt: null,
    rounding: 10,
    isCredit: false,
    cashier: "Budi",
    mode: "incoming",
    pay: 1300,
    note: "Contoh catatan struk",
    fix: 0,
    customer: { name: "Andi", phone: "081234567890" },
    supplier: { id: null, name: "" },
    subTotal: 10000,
    total: 12_000_000,
    grandTotal: 12_000_010,
    change: 90,
    methods: [{ id: "mock-method-1", methodId: "1000", pay: 1300, name: null, kind: "cash" }],
    updatedAt: 0,
    syncAt: null,
    deletedAt: null,
    pairId: null,
  },
  extras: [
    { id: "mock-extra-1", name: "Diskon", value: -1000, eff: -1000, kind: "number", flag: 0 },
    { id: "mock-extra-2", name: "PPN", value: 11, eff: 1000, kind: "percent", flag: 0 },
  ],
  products: [
    {
      id: "mock-listing-1",
      productId: null,
      unit: 1,
      portions: [],
      name: "Semangka",
      kind: "retail",
      price: 1000,
      qty: 3,
      capital: 700,
      total: 3000,
      discounts: [
        discount("percent", 10, 1000),
        discount("number", 1234, 1234),
        discount("pcs", 1, 1000),
      ],
    },
    {
      id: "mock-listing-2",
      productId: null,
      unit: 1,
      portions: [],
      name: "Gorengan",
      kind: "retail",
      price: 2000,
      qty: 2,
      capital: 1500,
      total: 4000,
      discounts: [],
    },
    {
      id: "mock-listing-3",
      productId: null,
      unit: 1,
      portions: [],
      name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed at congue massa, in pharetra diam.",
      kind: "retail",
      price: 2000,
      qty: 2,
      capital: 1500,
      total: 4000,
      discounts: [],
    },
  ],
  socials: [
    { id: "mock-social-1", name: "Shopee", value: "@andi", updatedAt: 0, syncAt: null },
    { id: "mock-social-2", name: "Instagram", value: "@dewi", updatedAt: 0, syncAt: null },
  ],
};
