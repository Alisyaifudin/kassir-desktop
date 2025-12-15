import React, { useEffect, useState } from "react";
import { LoadingBig } from "~/components/Loading";
import { Size } from "~/lib/store-old";
import { createAtom } from "@xstate/store";

// export const sizeStore = store<Size>("big");
export const sizeStore = createAtom<Size>("big")

function useInit(size: Size) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    sizeStore.set(size);
    if (size === "big") {
      document.body.removeAttribute("data-size");
    } else {
      document.body.setAttribute("data-size", size);
    }
    // body.classList.add(sizeClass[size]);
    setLoading(false);
  }, []);
  return loading;
}

export function Provider({ size, children }: { size: Size; children: React.ReactNode }) {
  const loading = useInit(size);
  if (loading) return <LoadingBig />;
  return children;
}
