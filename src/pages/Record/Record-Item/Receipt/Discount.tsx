export function Discount({ kind: kind, value }: { kind: DB.DiscKind; value: number }) {
  switch (kind) {
    case "number":
      return <div />;
    case "percent":
      return <p>(Diskon {value}%)</p>;
    case "pcs":
      return <p>(Diskon {value}pcs)</p>;
  }
}
