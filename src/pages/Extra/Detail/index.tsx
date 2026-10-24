import { LoaderFunctionArgs, RouteObject, useLoaderData } from "react-router";
import Page from "./page.tsx";

export const extraDetailRoute: RouteObject = {
  Component: () => {
    const id = useLoaderData<typeof loader>();
    return <Page id={id} />;
  },
  loader,
  path: ":id",
};

function loader({ params }: LoaderFunctionArgs) {
  return params.id!;
}
