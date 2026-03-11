import Decimal from "decimal.js";

export function Discount({ type, value }: { type: "number" | "percent"; value: number }) {
  switch (type) {
    case "number":
      return <p>(Disc. {value.toLocaleString("id-ID")})</p>;
    case "percent":
      return <p>(Disc. {value}%)</p>;
  }
}

export function calcDisc(type: "number" | "percent", value: number, subtotal: number) {
  switch (type) {
    case "number":
      return value;
    case "percent":
      return new Decimal(subtotal).times(value).div(100).round().toNumber();
  }
}