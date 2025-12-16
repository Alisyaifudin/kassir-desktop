import React, { useEffect, useState } from "react";
import { LoadingBig } from "~/components/Loading";
import { Size } from "~/lib/store-old";
import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { migration } from "~/database/migrations";
import { Loader2 } from "lucide-react";

export const sizeStore = createAtom<Size>("big");

function useInit(size: Size) {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<null | number>(0);
  useEffect(() => {
    sizeStore.set(size);
    setLoading(false);
    const mig = migration();
    mig.on("update", (percent) => {
      setUpdating(percent);
    });
    mig.on("finish", () => {
      setUpdating(null);
    });
  }, []);
  const s = useAtom(sizeStore);
  useEffect(() => {
    if (s === "big") {
      document.body.removeAttribute("data-size");
    } else {
      document.body.setAttribute("data-size", s);
    }
  }, [s]);
  return [updating, loading] as const;
}

export function Provider({ size, children }: { size: Size; children: React.ReactNode }) {
  const [updating, loading] = useInit(size);
  if (loading) return <LoadingBig />;
  if (updating !== null) {
    if (updating === 0) return <LoadingBig />;
    return (
      <main className="h-screen w-screen gap-3 flex items-center justify-center">
        <Loader2 className="animate-spin" size={100} />
        <p>Memutakhirkan: {(updating * 100).toFixed(2)}%</p>
      </main>
    );
  }
  return children;
}
