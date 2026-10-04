import { Link, Outlet, useLocation, useParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import { useStream } from "~/components/Loader";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import { ProductErrorBoundary, ProductErrorFallback } from "../z-Error";

const TABS = [
  { id: "info", label: "Info", path: "" },
  { id: "image", label: "Gambar", path: "image" },
  { id: "performance", label: "Performa", path: "performance" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function activeTab(pathname: string, id: string): TabId {
  const rest = pathname.split(`/products/${id}`)[1]?.replace(/^\//, "") ?? "";
  if (rest.startsWith("image")) return "image";
  if (rest.startsWith("performance")) return "performance";
  return "info";
}

export default function Page() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const res = useStream(service.product.get.changesFull);

  if (id === undefined) return null;

  const base = `/products/${id}`;
  const active = activeTab(pathname, id);
  const product = res.type === "success" ? res.data.find((item) => item.id === id) : undefined;

  return (
    <ProductErrorBoundary fallback={ProductErrorFallback}>
      <main className="mx-auto flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden small:h-[calc(100vh-48px)]">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/products"
              className="flex items-center gap-1 text-normal text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" /> Produk
            </Link>
            <span className="truncate font-semibold">
              {product?.name ?? (res.type === "init" ? "…" : "Produk tidak ditemukan")}
            </span>
          </div>
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path ? `${base}/${tab.path}` : base}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-normal font-medium transition-all",
                  active === tab.id && "bg-background text-foreground shadow",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet context={{ id }} />
        </div>
      </main>
    </ProductErrorBoundary>
  );
}
