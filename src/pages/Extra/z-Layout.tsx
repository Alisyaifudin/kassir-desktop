import { useScroll } from "~/hooks/use-scroll";

export function Layout({ children, className }: { children: React.ReactNode; className?: string }) {
  const [ref, handleScroll] = useScroll();
  return (
    <main className={className} ref={ref} onScroll={handleScroll}>
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Biaya Lainnya</h1>
      </div>
      {children}
    </main>
  );
}
