import { useScroll } from "~/hooks/use-scroll";

export function Layout({ children, className }: { children: React.ReactNode; className?: string }) {
  const [ref, handleScroll] = useScroll();
  return (
    <main className={className} ref={ref} onScroll={handleScroll}>
      {children}
    </main>
  );
}
