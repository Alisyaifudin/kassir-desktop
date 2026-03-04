import React, { useEffect, useState } from "react";
import { setSize } from "~/hooks/use-size";
import { Size } from "~/store/size/get";

function useInit(size: Size) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setSize(size);
    if (size === "big") {
      document.body.classList.remove("small");
    } else {
      document.body.classList.add("small");
    }
    setLoading(false);
  }, []);
  return loading;
}

export function Provider({ size, children }: { size: Size; children: React.ReactNode }) {
  const loading = useInit(size);
  if (loading) return null;
  return children;
}
