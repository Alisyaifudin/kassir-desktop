import { useEffect } from "react";
import { useNavigate } from "react-router";
import { showShortcut } from "./use-shortcut";

const linkMap = {
  0: "/",
  1: "/stock",
  2: "/records",
  3: "/analytics",
  4: "/money",
  5: "/setting",
} as Record<string, string>;

let press = false;

export function useNavigationShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.altKey) return;
      const link = linkMap[e.key] as string | undefined;
      if (link === undefined) return;
      showShortcut(false);
      navigate(link);
    }

    function handleAltDown(e: KeyboardEvent) {
      if (e.altKey) {
        e.preventDefault();
        if (press) return;
        showShortcut((prev) => !prev);
        press = true;
      }
    }

    function handleAltUp(e: KeyboardEvent) {
      if (!e.altKey) {
        e.preventDefault();
        press = false;
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
  }, [navigate]);
}
