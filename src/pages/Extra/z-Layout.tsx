export function Layout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={className}>
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Biaya Lainnya</h1>
      </div>
      {children}
    </main>
  );
}
