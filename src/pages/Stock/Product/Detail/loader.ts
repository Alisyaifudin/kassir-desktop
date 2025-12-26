import { LoaderFunctionArgs, redirect } from "react-router";
import { integer, Result } from "~/lib/utils";
import { LIMIT } from "./constants";
import { db } from "~/database";
import { ProductHistory } from "~/database/product/history";
import { z } from "zod";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const parsed = integer.safeParse(params.id);
  if (!parsed.success) {
    throw redirect("/stock");
  }
  const id = parsed.data;
  const [errMsg, product] = await db.product.get.byId(id);
  switch (errMsg) {
    case "Aplikasi bermasalah":
      throw new Error(errMsg);
    case "Tidak ditemukan":
      throw redirect("/stock");
  }
  const search = new URL(request.url).searchParams;
  const { page, mode } = getParams(search);
  const histories = db.product.get.history(id, (page - 1) * LIMIT, LIMIT, mode);
  return { product, histories };
}

export type HistoryPromise = Promise<
  Result<
    "Aplikasi bermasalah",
    {
      histories: ProductHistory[];
      total: number;
    }
  >
>;

export type Loader = typeof loader;

function getParams(search: URLSearchParams): { page: number; mode: "buy" | "sell" } {
  const pageRaw = integer.safeParse(search.get("page"));
  let page = 1;
  if (pageRaw.success && pageRaw.data >= 1) {
    page = pageRaw.data;
  }
  const modeRaw = z.enum(["buy", "sell"]).safeParse(search.get("mode"));
  let mode: "buy" | "sell" = "sell";
  if (modeRaw.success) {
    mode = modeRaw.data;
  }
  return { mode, page };
}
