import { capitalize } from "~/lib/capitalize";
import { Cashier } from "~/services/cashier";

type Props = {
  useUser: () => Cashier;
  today: string
};

export function Header({ useUser, today }: Props) {
  const user = useUser();

  return (
    <div className="flex flex-col gap-1 mb-8">
      <h1 className="text-big font-bold tracking-tight">
        Selamat Datang, {capitalize(user.name)}!
      </h1>
      <p className="text-muted-foreground">{today}</p>
    </div>
  );
}
