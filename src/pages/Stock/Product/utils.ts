import { z } from "zod";
import { db } from "~/database";
import { image } from "~/lib/image";
import { DefaultError, err, numeric, ok, Result } from "~/lib/utils";

export function getParams(search: URLSearchParams): { page: number; mode: "buy" | "sell" } {
  const pageRaw = numeric.safeParse(search.get("page"));
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

export type ImageResult = {
  href: string;
  id: number;
};

export type ImagePromise = Promise<Result<DefaultError, ImageResult[]>>;

export async function getImages(id: number): ImagePromise {
  const [errMsg, images] = await db.image.get.byProductId(id);
  if (errMsg) {
    return err(errMsg);
  }
  const res = await Promise.all(images.map((img) => image.load(img.name, img.mime)));
  const imageRes: ImageResult[] = [];
  let i = 0;
  for (const [errMsg, href] of res) {
    if (errMsg) {
      return err(errMsg);
    }
    imageRes.push({ href, id: images[i].id });
    i++;
  }
  return ok(imageRes);
}
