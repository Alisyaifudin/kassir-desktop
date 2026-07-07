import { NameForm } from "./z-NameForm";
import { SonnerService } from "~/services/sonner";
import { PasswordForm } from "./z-PasswordForm";
import { Effect } from "effect";
import { CashierService } from "~/services/cashier";
import { UserService } from "~/services/user";
import { HashService } from "~/services/hash";
import { promisify } from "~/lib/promisify";

const page = Effect.gen(function* () {
  const userService = yield* UserService;
  const cashierService = yield* CashierService;
  const hashService = yield* HashService;
  const sonner = yield* SonnerService;

  const onUpdateName = (id: string, name: string) =>
    promisify(
      () =>
        Effect.gen(function* () {
          yield* cashierService.set.name(id, name);
          const currentUser = userService.user;
          if (!currentUser) return "Pengguna tidak ditemukan";
          yield* userService.setUser({ ...currentUser, name });
          return null;
        }),
      ({ e }) => e.message,
    );

  const onUpdatePassword = (id: string, password: string) =>
    promisify(
      () =>
        Effect.gen(function* () {
          const hash = yield* hashService.hash(password);
          yield* cashierService.set.hash(id, hash);
          return null;
        }),
      ({ e }) => e.message,
    );

  const useUser = () => userService.useUser();
  return function Page() {
    const user = useUser();

    return (
      <div className="flex flex-col gap-6 p-6 flex-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Pengaturan Profil</h1>
          <p className="text-muted-foreground text-normal">Kelola informasi akun dan keamanan</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <NameForm user={user} onUpdateName={onUpdateName} />
          </div>

          <div className="rounded-2xl border bg-destructive p-6 shadow-sm">
            <PasswordForm userId={user.id} sonner={sonner} onUpdatePassword={onUpdatePassword} />
          </div>
        </div>
      </div>
    );
  };
});

export default page;
