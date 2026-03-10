import { data, LoaderFunctionArgs, redirect } from "react-router";
import { integer } from "~/lib/utils";

export async function loader({ params }: LoaderFunctionArgs) {
  const parsed = integer.safeParse(params.id);
  if (!parsed.success) {
    throw redirect("/stock");
  }
  const id = parsed.data;
  return data(id)
}

export type Loader = typeof loader;
