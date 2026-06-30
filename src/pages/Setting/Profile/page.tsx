import { nameFormEffect } from "./effect-nameForm";
import { passwordFormEffect } from "./effect-passwordForm";
import { Effect } from "effect";

const page = Effect.gen(function* () {
  const NameForm = yield* nameFormEffect;
  const PasswordForm = yield* passwordFormEffect;
  return function Page() {
    return (
      <div className="flex flex-col gap-6 p-6 flex-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Pengaturan Profil</h1>
          <p className="text-muted-foreground text-normal">Kelola informasi akun dan keamanan</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <NameForm />
          </div>

          <div className="rounded-2xl border bg-destructive p-6 shadow-sm">
            <PasswordForm />
          </div>
        </div>
      </div>
    );
  };
});

export default page;
