import { Name } from "./z-Name";
import { PasswordForm } from "./z-PasswordForm";

export default function Page() {
  return (
    <div className="flex flex-col gap-6 p-6 flex-1">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Pengaturan Profil</h1>
        <p className="text-muted-foreground text-normal">
          Kelola informasi akun dan keamanan
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <Name />
        </div>
        
        <div className="rounded-2xl border bg-destructive p-6 shadow-sm">
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
