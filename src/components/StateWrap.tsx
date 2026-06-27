import { Status } from "~/lib/state";

export function StateWrap<E>({
  status,
  children,
  loading,
  error,
}: {
  status: Status<E>;
  children: React.ReactNode;
  error: (error: E) => React.ReactNode;
  loading?: React.ReactNode;
}) {
  switch (status.state) {
    case "loading":
      return loading;
    case "error":
      return error(status.error);
  }
  return children;
}
