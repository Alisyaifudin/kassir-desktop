import { auth } from "~/lib/auth";

export function useLogout() {
  function handleClick() {
    auth.set(undefined);
    window.location.pathname = "/login";
  }
  return handleClick;
}
