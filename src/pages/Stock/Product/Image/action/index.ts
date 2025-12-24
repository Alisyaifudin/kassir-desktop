import { ActionFunctionArgs, redirect } from "react-router";
import { integer } from "~/lib/utils";
import { deleteImageAction } from "./del";
import { addImageAction } from "./add";
import { swapImageAction } from "./swap";
import { auth } from "~/lib/auth";

export async function action({ request, params }: ActionFunctionArgs) {
  const user = auth.user();
  if (user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const parsed = integer.safeParse(params.id);
  if (!parsed.success) {
    throw redirect("/stock");
  }
  const id = parsed.data;
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "delete": {
      const error = await deleteImageAction(formdata);
      return { error, action };
    }
    case "add": {
      const error = await addImageAction(id, formdata);
      return { error, action };
    }
    case "swap": {
      const error = await swapImageAction(formdata);
      return { error, action };
    }
    default:
      throw new Error(`Invalid action: ${action}`);
  }
}

export type Action = typeof action;
