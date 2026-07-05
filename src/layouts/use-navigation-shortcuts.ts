import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

const linkMap = {
  0: "/shop",
  1: "/stock",
  2: "/records",
  3: "/money",
  4: "/setting",
} as Record<string, string>;

export function useNavigationShortcuts(
  hideShortcut: () => void,
  toggleShortcut: () => void,
) {
  const navigate = useNavigate();
  const pressRef = useRef(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.altKey) return;
      const link = linkMap[e.key] as string | undefined;
      if (link === undefined) return;
      hideShortcut();
      navigate(link);
    }

    function handleAltDown(e: KeyboardEvent) {
      if (e.altKey) {
        e.preventDefault();
        if (pressRef.current) return;
        toggleShortcut();
        pressRef.current = true;
      }
    }

    function handleAltUp(e: KeyboardEvent) {
      if (!e.altKey) {
        e.preventDefault();
        pressRef.current = false;
      }
    }

    document.body.addEventListener("keydown", handleKey);
    document.body.addEventListener("keydown", handleAltDown);
    document.body.addEventListener("keyup", handleAltUp);

    return () => {
      document.body.removeEventListener("keydown", handleKey);
      document.body.removeEventListener("keydown", handleAltDown);
      document.body.removeEventListener("keyup", handleAltUp);
    };
  }, [navigate, hideShortcut, toggleShortcut]);
}
