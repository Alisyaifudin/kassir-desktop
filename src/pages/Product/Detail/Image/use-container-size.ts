import { useEffect, useRef, useState } from "react";

export const useContainerSize = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [screenSize, setScreenSize] = useState({
    width: ref.current?.clientWidth ?? 0,
    height: ref.current?.clientHeight ?? 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: ref.current?.clientWidth ?? 0,
        height: ref.current?.clientHeight ?? 0,
      });
    };
    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return [ref, screenSize] as const;
};

export const useControlSize = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (ref.current === null) return;
    const dom = ref.current;
    const handleResize = () => {
      setScreenSize({ width: dom.clientWidth ?? 0, height: dom.clientHeight ?? 0 });
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [ref]);

  return [ref, screenSize] as const;
};
