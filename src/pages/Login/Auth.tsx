import { auth, User } from "~/lib/auth";
import Redirect from "../../components/Redirect";
import { Suspense, use } from "react";
import { TextError } from "../../components/TextError";
import { Store } from "~/lib/store-old";

export function Auth({
  store,
  children,
}: {
  store: Store;
  children: (user: User) => React.ReactNode;
}) {
  return (
    <Suspense>
      <Wrapper store={store}>{(user) => children(user)}</Wrapper>
    </Suspense>
  );
}

function Wrapper({ children, store }: { store: Store; children: (user: User) => React.ReactNode }) {
  const [errMsg, user] = use(auth.decode(store));
  if (errMsg) {
    return <TextError>{errMsg}</TextError>;
  }
  if (user === null) {
    return <Redirect to="/login" />;
  }
  return children(user);
}
