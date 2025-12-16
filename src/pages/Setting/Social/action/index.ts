import { editAction } from "./edit";
import { deleteAction } from "./delete";
import { newAction } from "./new";
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
    case "edit": {
      const error = await editAction(formdata);
      return { action, error };
    }
    case "delete": {
      const error = await deleteAction(formdata);
      return { action, error };
    }
    case "new": {
      const error = await newAction(formdata);
      return { action, error };
    }
    default:
      throw new Error("Invalid action");
  }
}

export type Action = typeof action;
