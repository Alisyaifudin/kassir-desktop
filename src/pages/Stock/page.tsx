import { Link, Outlet } from "react-router";

export default function Page() {
  return (
    <main className="flex flex-col gap-5 py-2 px-0.5 flex-1 overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]">
      <div>
        <Link to="/stock/product">Produk</Link>
        <Link to="/stock/extra">Biaya Lainnya</Link>
      </div>
      <Outlet />
    </main>
  );
}
