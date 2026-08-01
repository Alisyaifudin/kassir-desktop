import { Method } from "./z-Method";
import { Form } from "./z-Form";

export function Summary() {
  return (
    <div style={{ flex: "0 0 auto" }}>
      <hr />
      <div className="flex flex-col p-2 h-fit gap-2">
        <div className="flex flex-col gap-2 flex-1 h-full items-center justify-between">
          <div className="flex items-center gap-1 justify-between w-full">
            {/* a hack, sometimes the barcode reader read \t, so the search will become out of focus. this is an attempt to refocus */}
            <button onClick={() => document.getElementById("searchbar")?.focus()}></button>{" "}
            <Method />
          </div>
        </div>
        <Form />
      </div>
    </div>
  );
}
