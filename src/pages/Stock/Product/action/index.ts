import { ActionFunctionArgs, redirect } from "react-router";
import { getBackURL, integer } from "~/lib/utils";
import { editAction } from "./edit";
import { deleteAction } from "./delete";
import { deleteImageAction } from "./delete-image";
import { addImageAction } from "./add-image";
import { generateBarcodeAction } from "./generate-barcode";
import { swapImageAction } from "./swap-image";
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
  const search = new URL(request.url).searchParams;
  const backUrl = getBackURL("/stock", search);
  const formdata = await request.formData();
  const action = formdata.get("action");
  switch (action) {
    case "edit": {
      const error = await editAction(id, formdata, backUrl);
      return { error, action };
    }
    case "delete": {
      const error = await deleteAction(id, backUrl);
      return { error, action };
    }
    case "delete-image": {
      const error = await deleteImageAction(formdata);
      return { error, action };
    }
    case "add-image": {
      const error = await addImageAction(id, formdata);
      return { error, action };
    }
    case "swap-image": {
      const error = await swapImageAction(formdata);
      return { error, action };
    }
    case "generate-barcode": {
      const error = await generateBarcodeAction(id);
      return { error, action };
    }
    default:
      throw new Error(`Invalid action: ${action}`);
  }
}

export type Action = typeof action;
