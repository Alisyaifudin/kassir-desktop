import { createContext, useCallback, useContext, useState } from "react";
import { Size, Theme } from "~/services/config";

const ThemeContext = createContext<{
  theme: Theme;
  size: Size;
  setTheme: (theme: Theme) => void;
  setSize: (size: Size) => void;
}>({ theme: "light", size: "small", setSize: () => {}, setTheme: () => {} });

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<{ theme: Theme; size: Size }>({
    theme: "light",
    size: "small",
  });
  const setTheme = useCallback((theme: Theme) => {
    setValue((prev) => {
      if (prev === null) return prev;
      return { ...prev, theme };
    });
  }, []);
  const setSize = useCallback((size: Size) => {
    setValue((prev) => {
      if (prev === null) return prev;
      return { ...prev, size };
    });
  }, []);
  return (
    <ThemeContext.Provider value={{ theme: value.theme, size: value.size, setSize, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  return [theme.theme, theme.setTheme] as const;
}

export function useSize() {
  const theme = useContext(ThemeContext);
  return [theme.size, theme.setSize] as const;
}

export default ThemeProvider;
