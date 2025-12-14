import { auth } from "~/lib/auth";

export function useUser() {
  const user = auth.get();
  if (user === undefined) {
    throw new Error("Unauthenticated");
  }
  // const v = useStoreValue(userStore);
  return user;
}
