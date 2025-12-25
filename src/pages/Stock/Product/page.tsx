import { Link, Outlet, useLoaderData, useLocation, useSearchParams } from "react-router";
import { cn, getBackURL } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";

export default function Page() {
  const id = useLoaderData();
  const [search] = useSearchParams();
  const size = useSize();
  const backURL = getBackURL("/stock", search);
  return (
    <main
      className={cn(
        "py-2 px-5 mx-auto w-full h-full flex flex-col gap-2 overflow-hidden",
        css.nav[size]
      )}
    >
      <div className="flex items-center justify-between">
        <Button asChild variant="link" className="self-start">
          <Link to={backURL}>
            <ChevronLeft /> Kembali
          </Link>
        </Button>
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
          <TabsTrigger id={id} tab="detail">
            Detail
          </TabsTrigger>
          <TabsTrigger id={id} tab="images">
            Gambar
          </TabsTrigger>
          <TabsTrigger id={id} tab="performance">
            Performa
          </TabsTrigger>
        </div>
      </div>
      <Outlet />
    </main>
  );
}

const tabs = (id: number) => ({
  detail: `/stock/product/${id}`,
  images: `/stock/product/${id}/images`,
  performance: `/stock/product/${id}/performance`,
});

function TabsTrigger({
  children,
  id,
  tab,
}: {
  children: React.ReactNode;
  id: number;
  tab: "detail" | "images" | "performance";
}) {
  const to = tabs(id)[tab];
  const active = useActive();
  return (
    <Link to={to}>
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          { "bg-background text-foreground shadow": active === tab }
        )}
      >
        {children}
      </button>
    </Link>
  );
}

function useActive(): "detail" | "images" | "performance" {
  const { pathname } = useLocation();
  const pathnames = pathname.split("/");
  if (pathnames.length <= 4) return "detail";
  switch (pathnames[4]) {
    case "images":
      return "images";
    case "performance":
      return "performance";
    default:
      return "detail";
  }
}
