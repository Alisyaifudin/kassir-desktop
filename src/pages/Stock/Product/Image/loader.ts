import { data, LoaderFunctionArgs, redirect } from "react-router";
import { DefaultError, err, integer, ok, Result } from "~/lib/utils";
import { db } from "~/database";
import { image } from "~/lib/image";

export async function loader({ params }: LoaderFunctionArgs) {
  const parsed = integer.safeParse(params.id);
  if (!parsed.success) {
    throw redirect("/stock");
  }
  const id = parsed.data;
  const [errMsg, images] = await getImages(id);
  if (errMsg) {
    throw new Error(errMsg);
  }
  return data(images);
}

export type Loader = typeof loader;

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
