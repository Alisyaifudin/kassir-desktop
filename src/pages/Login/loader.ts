import { redirect } from "react-router";
import { auth } from "~/lib/auth";

export async function loader() {
  const user = auth.get();
  if (user !== undefined) {
    throw redirect("/setting");
  }
}
