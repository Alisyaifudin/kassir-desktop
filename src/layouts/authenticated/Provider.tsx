import { store } from "@simplestack/store";
import React, { useEffect, useState } from "react";
import { LoadingBig } from "~/components/Loading";
import { User } from "~/lib/auth";

export const userStore = store<User>({
  name: "",
  role: "user",
});
function useInit(user: User) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    userStore.set(user);
    setLoading(false);
  }, []);
  return loading;
}

export function Provider({ user, children }: { user: User; children: React.ReactNode }) {
  const loading = useInit(user);
  if (loading) return <LoadingBig />;
  return children;
}
