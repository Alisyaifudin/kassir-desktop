import { data, LoaderFunctionArgs, redirect } from "react-router";
import { db } from "~/database";
import { integer } from "~/lib/utils";

export async function loader({ params }: LoaderFunctionArgs) {
  const parsed = integer.safeParse(params.id);
  if (!parsed.success) {
    throw redirect("/stock?tab=extra");
  }
  const id = parsed.data;
  const [errMsg, extra] = await db.extra.get.byId(id);
  switch (errMsg) {
    case "Aplikasi bermasalah":
      throw new Error(errMsg);
    case "Tidak ditemukan":
      throw redirect("/stock?tab=additional");
  }
  return data(extra);
}

export type Loader = typeof loader;
