import { Button } from "~/components/ui/button";

export function ProductSync({ token }: { token: string }) {
  return (
    <li className="flex justify-between items-center">
      <span>Produk</span>
      <Button>Sinkronisasi</Button>
    </li>
  );
}
