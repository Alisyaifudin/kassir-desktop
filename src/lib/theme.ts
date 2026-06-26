import { Theme } from "~/services/config";

type TheTheme = Exclude<Theme, "system">;

export function setTheme(theme: Theme) {
  let theTheme: TheTheme;
  if (theme === "system") {
    theTheme = getSystemTheme();
  } else {
    theTheme = theme;
  }
  if (theTheme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

const getSystemTheme = () => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
