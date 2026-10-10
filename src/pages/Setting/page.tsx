import { Header } from "./z-Header";
import { NavCard } from "./z-NavCard";
import { useNav } from "./use-nav";

export default function Page() {
  const { groups } = useNav();
  return (
    <div className="flex flex-col gap-6 py-2">
      <Header />
      {groups.map((group) => (
        <section key={group.section} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 rounded-full bg-primary" />
            <h2 className="text-big font-bold tracking-tight">{group.section}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item, i) => (
              <NavCard key={item.path} item={item} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
