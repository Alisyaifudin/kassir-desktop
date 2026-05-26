import { useUser } from "~/hooks/use-user";
import { capitalize } from "~/lib/utils";

export function Header() {
  const user = useUser();
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-1 mb-8">
      <h1 className="text-big font-bold tracking-tight">
        Selamat Datang, {capitalize(user.name)}!
      </h1>
      <p className="text-muted-foreground">{today}</p>
    </div>
  );
}
