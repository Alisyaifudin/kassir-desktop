import { redirect } from "react-router";
import { integer, LoaderArgs, Result } from "~/lib/utils";
import { getContext } from "~/middleware/global";
import { getImages, getParams } from "./utils";
import { ProductHistory } from "~/database/old/product";
import { LIMIT } from "./constants";
import { getUser } from "~/middleware/authenticate";

export async function loader({ params, context, request }: LoaderArgs) {
  const parsed = integer.safeParse(params.id);
  if (!parsed.success) {
    throw redirect("/stock");
  }
  const id = parsed.data;
  const { db, store } = getContext(context);
  const [errMsg, product] = await db.product.get.byId(id);
  switch (errMsg) {
    case "Aplikasi bermasalah":
      throw new Error(errMsg);
    case "Tidak ditemukan":
      throw redirect("/stock");
  }
  const images = getImages(id, db);
  const size = await store.size();
  const user = await getUser(context);
  const search = new URL(request.url).searchParams;
  const { page, mode } = getParams(search);
  const histories = db.product.get.history(id, (page - 1) * LIMIT, LIMIT, mode);
  return { size, product, images, histories, role: user.role, id };
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
