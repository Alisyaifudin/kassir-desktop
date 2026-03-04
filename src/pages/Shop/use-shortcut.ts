import { useEffect } from "react";

export const useShortcut = () =>
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case "F1": {
          const el = document.getElementById("searchbar");
          el?.focus();
          break;
        }
        case "F2": {
          const el = document.getElementById("pay-input");
          el?.focus();
          break;
        }
      }
    }
    document.body.addEventListener("keydown", handleKey);
    return () => {
      document.body.removeEventListener("keydown", handleKey);
    };
  }, []);
