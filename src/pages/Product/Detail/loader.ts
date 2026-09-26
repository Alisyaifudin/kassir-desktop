import { LoaderFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs) {
  return params.id!;
}

export type Loader = typeof loader;
