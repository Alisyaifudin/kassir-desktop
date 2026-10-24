import { Link, Outlet, useLocation, useParams } from "react-router";
import { pageData } from "./data";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { useUser } from "~/hooks/use-user";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import { SkeletonText } from "~/components/ui/skeleton";
import { PublishToggle } from "./z-Publish";
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
  return (
    <pageData.Provider sources={{ products: service.product.get.changesFull }}>
      <Content />
    </pageData.Provider>
  );
}

/**
 * The tab strip is static — its three labels come from the route, not the
 * product — so it is clickable before the row arrives. Only the product's name is
 * data in this header, and it pulses where it will land; the publish chip is drawn
 * with it, disabled, because an action needs something to act on but its frame
 * does not.
 */
function Content() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const res = pageData.use("products");
  const backUrl = useGetUrlBack("/products");
  const role = useUser().role;

  if (id === undefined) return null;

  const base = `/products/${id}`;
  const search = `url_back=${encodeURIComponent(backUrl)}`;
  const active = activeTab(pathname, id);
  const product = res.type === "success" ? res.data.find((item) => item.id === id) : undefined;

  return (
    <ProductErrorBoundary fallback={ProductErrorFallback}>
      <main className="mx-auto flex h-[calc(100vh-68px)] w-full flex-col overflow-hidden small:h-[calc(100vh-44px)]">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex min-w-0 items-center text-normal font-semibold">
              {product === undefined ? (
                res.type === "init" ? (
                  <SkeletonText className="w-40" />
                ) : res.type === "error" ? (
                  "Gagal memuat produk"
                ) : (
                  "Produk tidak ditemukan"
                )
              ) : (
                <span className="truncate">{product.name}</span>
              )}
            </span>
            {role === "admin" ? (
              // The chip is chrome: it is here before the row is, disabled. Only
              // the word inside it — the published state — is a value.
              <PublishToggle product={product} />
            ) : null}
          </div>
          <div className="inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                to={{ pathname: tab.path ? `${base}/${tab.path}` : base, search }}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-small font-medium transition-all",
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
