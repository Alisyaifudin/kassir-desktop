import { Skeleton } from "~/components/ui/skeleton";

type Props = {
  useLog: () => string[];
};

export function ReadLog({ useLog }: Props) {
  const lines = useLog();
  return (
    <>
      {lines.map((t, i) => (
        <p className="text-white text-small" key={i}>
          {t}
        </p>
      ))}
    </>
  );
}

export function LoadingLines() {
  return (
    <div className="flex flex-col gap-2 p-2 w-full">
      {Array.from({ length: 30 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 bg-white/10 rounded animate-pulse"
          style={{ width: `${60 + ((i * 7) % 40)}%` }}
        />
      ))}
    </div>
  );
}
