import { Social } from "~/services/social/type";
import { SocialItem } from "./z-SocialItem";

type Props = {
  useSocials: () => Social[];
  onUpdate: (id: string, name: string, value: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
};

export function SocialList({ useSocials, onUpdate, onDelete }: Props) {
  const socials = useSocials();
  if (socials.length === 0) return <p className="text-big">---Belum Ada---</p>;
  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      {socials.map((s) => (
        <SocialItem key={s.id} social={s} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
}
