import { To, useRouteError } from "react-router";
import Redirect from "~/components/Redirect";

// Create a special error class for redirects
export class RedirectError extends Error {
  name = "RedirectError";
  constructor(public to: To) {
    super(`Redirect to ${to}`);
  }
}

export default function ErrorBoundary() {
  const error = useRouteError();
  if (error instanceof RedirectError) {
    return <Redirect to={error.to} />;
  }
  return <ErrorBoundary />;
}
