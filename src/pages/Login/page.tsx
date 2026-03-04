import { LoginForm } from "./z-LoginForm";
import { FreshForm } from "./z-FreshForm";
import { Result } from "~/lib/result";
import { db } from "~/database-effect";
import { ErrorComponent } from "~/components/ErrorComponent";

export default function Page() {
  const res = Result.use({
    fn: () => db.cashier.get.all(),
    key: "cashiers",
  });
  return Result.match(res, {
    onError(error) {
      console.error(error.e);
      return <ErrorComponent title="Aplikasi bermasalah ☠">{error.e.message}</ErrorComponent>;
    },
    onSuccess(cashiers) {
      if (cashiers.length > 0) {
        return (
          <div className="flex flex-1 flex-col justify-center bg-zinc-950">
            <LoginForm cashiers={cashiers} />
          </div>
        );
      }
      return (
        <div className="flex flex-1 flex-col justify-center bg-zinc-950">
          <FreshForm />;
        </div>
      );
    },
  });
}
