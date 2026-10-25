import type { ProductFull } from "~/services/product";
import { TextError } from "~/components/TextError";
import { NotFound } from "~/components/NotFound";
import { useUser } from "~/hooks/use-user";
import { pageData } from "../data";
import { useId } from "../use-id";
import { History } from "./History";
import { EditPane, EditPaneSkeleton } from "./z-EditPane";
import { UserInfo } from "./z-UserInfo";

/**
 * The tab's body is two columns of chrome, and both are drawn from the first
 * frame: the form's five sections on the left, the Riwayat card and its filter on
 * the right. The page-shaped skeleton this tab used to show is gone — the tab
 * header above it and the tab strip in it never waited, and neither does this.
 *
 * `products` is still the tab's one read, so a failure and a missing row are the
 * body's own states: the error and `NotFound` replace the columns, because there
 * is nothing static left to keep for them.
 */
export default function Page() {
  const id = useId();

  return (
    <pageData.Gate
      keys={["products"]}
      // The form before its product is still *the form*: every label, hint,
      // section title and button is static, so the placeholder is drawn at once
      // (no 200 ms blank) and only the value slots inside it wait.
      delay={0}
      pulse={<Body id={id} product={undefined} />}
      error={(error) => (
        <div className="p-4">
          <TextError>{error.message}</TextError>
        </div>
      )}
    >
      {({ products }) => {
        const product = products.find((item) => item.id === id);
        // Read, and this id is not in it.
        if (product === undefined) return <NotFound />;
        return <Body id={id} product={product} />;
      }}
    </pageData.Gate>
  );
}

/**
 * The tab's two columns. `product === undefined` is the waiting shape: the
 * form's own skeleton on the left, the journal's cards with their rows pulsing on
 * the right — the same markup the real body uses, so nothing moves when the row
 * lands (`EditPane` replaces `EditPaneSkeleton` in place, and `History` is not
 * remounted at all, because it is the same element in the same position).
 */
function Body({ id, product }: { id: string; product: ProductFull | undefined }) {
  const role = useUser().role;

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-hidden p-4 lg:grid-cols-[1fr_560px]">
      <div className="min-h-0 overflow-y-auto px-1">
        {role === "admin" ? (
          product === undefined ? <EditPaneSkeleton /> : <EditPane product={product} />
        ) : (
          <UserInfo product={product} />
        )}
      </div>
      <div className="min-h-0 overflow-hidden">
        {/* The journal is the one read that needs a product id and a revision:
            the id is the route's, the revision is the row's. The card and its
            filter are drawn either way; only the rows wait. */}
        <History productId={id} revision={product?.updatedAt ?? null} />
      </div>
    </div>
  );
}
