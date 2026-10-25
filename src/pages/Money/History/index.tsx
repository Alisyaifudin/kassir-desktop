import { LoaderFunctionArgs, RouteObject, useLoaderData } from "react-router";
import Page from "./page";

export const moneyHistoryRoute: RouteObject = {
  path: ":pocketId",
  Component: () => {
    const pocketId = useLoaderData<typeof loader>();
    return <Page pocketId={pocketId} />;
  },
  loader,
};

function loader({ params }: LoaderFunctionArgs) {
  return params.pocketId!;
}
