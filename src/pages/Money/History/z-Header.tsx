import { NameForm } from "./z-NameForm";
import { SonnerService } from "~/services/sonner";

type Props = {
  usePocket: () => { name: string; id: string };
  NewRecordSlot: React.ReactNode;
  sonner: typeof SonnerService.Type;
  onUpdateName: (pocketId: string, name: string) => Promise<string | null>;
};

export function Header({ usePocket, NewRecordSlot, sonner, onUpdateName }: Props) {
  const pocket = usePocket();
  return (
    <header className="flex items-center justify-between">
      <NameForm pocketId={pocket.id} name={pocket.name} sonner={sonner} onUpdate={onUpdateName} />
      <div className="flex items-center gap-3">{NewRecordSlot}</div>
    </header>
  );
}
