import { createPageData } from "~/components/page-data";
import type { InvokeError } from "~/lib/effect-error";
import { imageOptimizePlan, type ImageOptPlan } from "~/lib/image-opt";

/**
 * Pengaturan → Gambar.
 *
 * One key, because the screen asks one question: what would the job do? The run
 * is a write, and it is not a key — `useMutation` marks this one `refetching`
 * while it runs and re-reads it when it lands, so the numbers update themselves
 * and the page never shows a stale plan next to a fresh summary.
 */
type ImageData = {
  plan: ImageOptPlan;
};

// Not cached. The plan describes files on disk, and the disk changes without this
// app knowing: yesterday's answer would sit on the screen claiming 412 MB after
// the operator had already optimized and added another hundred pictures. A
// read-once key that must be true every time it is read is exactly what `skip`
// is for.
export const pageData = createPageData<ImageData, InvokeError>("ImagePage", {
  cache: { skip: ["plan"] },
});

/** The scan: reads and hashes every live picture. Writes nothing. */
export const planSource = imageOptimizePlan();
