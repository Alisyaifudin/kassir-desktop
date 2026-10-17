import { Tabs } from "./z-Tabs";
import { Lines } from "./z-Lines";
import { Meta } from "./z-Meta";
import { Total } from "./z-Total";

/**
 * The purchase being assembled: which draft is open, what is in it, who it is
 * for, and what it costs.
 *
 * The sale screen tints this whole region and stamps a "BELI" watermark on it,
 * because there one page served both directions. This page only ever buys, so
 * the watermark would be stating the obvious on every screen — dropped, and
 * the tint with it.
 */
export function Draft() {
  return (
    <section className="m-1 flex flex-1 flex-col overflow-hidden border-r">
      <Tabs />
      <Lines />
      <Meta />
      <Total />
    </section>
  );
}
