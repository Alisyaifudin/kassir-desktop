import { Method } from "./z-Method";
import { Payment } from "./z-Payment";

/**
 * Settling the open draft: method, then the money.
 *
 * The left column bottom half, mirroring the sale screen's arrangement so the
 * two screens are the same shape to a cashier's hands — totals and the pay
 * button in the same place on both.
 */
export function Checkout() {
  return (
    <div className="flex-none">
      <hr />
      <div className="flex h-fit flex-col gap-2 p-2">
        <Method />
        <Payment />
      </div>
    </div>
  );
}
