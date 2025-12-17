import { newAction } from "./new";
import { deleteAction } from "./delete";
import { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth";

export async function action({ request }: ActionFunctionArgs) {
  const user = auth.user();
  if (user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "new": {
      const error = await newAction(formdata);
      return { error, action };
    }
    case "delete": {
      const error = await deleteAction(formdata);
      return { error, action };
    }
    default:
      throw new Error(`Invalid action: ${action}`);
  }
}

export type Action = typeof action;
