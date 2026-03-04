import { auth } from "~/lib/auth-effect";

export function useLogout() {
  function handleClick() {
    auth.set(undefined);
    window.location.pathname = "/login";
  }
  return handleClick;
}
