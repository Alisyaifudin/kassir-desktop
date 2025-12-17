import { LoaderFunctionArgs, redirect } from "react-router";
import { integer, Result } from "~/lib/utils";
import { getImages, getParams } from "./utils";
import { LIMIT } from "./constants";
import { db } from "~/database";
import { ProductHistory } from "~/database/product/history";

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
  const images = getImages(id);
  const search = new URL(request.url).searchParams;
  const { page, mode } = getParams(search);
  const histories = db.product.get.history(id, (page - 1) * LIMIT, LIMIT, mode);
  return { product, images, histories, id };
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
