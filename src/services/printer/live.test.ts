import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Stream } from "effect";
import { makeTestStore } from "../store/test-support";
import { PrinterService, type Printer } from ".";
import { PrinterLive } from "./live";

/**
 * The chosen printer and paper width decide how the receipt PDF is laid out, so
 * a width that is not a positive number has to come back as the 80 mm default —
 * a layout step of 0 would fold every line at zero characters.
 */
function setup(seed: Record<string, unknown> = {}) {
  const store = makeTestStore(seed);
  return { entries: store.entries, layer: PrinterLive.pipe(Layer.provide(store.layer)) };
}

function run<A>(
  layer: Layer.Layer<PrinterService>,
  program: (printer: Context.Tag.Service<typeof PrinterService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const printer = yield* PrinterService;
      return yield* program(printer);
    }).pipe(Effect.provide(layer)),
  );
}

describe("PrinterService", () => {
  test("with nothing chosen, the receipt lays out for 80 mm and no printer", async () => {
    const { layer } = setup();
    expect(await run(layer, (printer) => printer.get())).toEqual({ name: "", width: 80 });
  });

  test("a saved printer is hydrated on the next launch", async () => {
    const { layer } = setup({ printer_name: "EPSON TM-T20", printer_width: 58 });

    expect(await run(layer, (printer) => printer.get())).toEqual({
      name: "EPSON TM-T20",
      width: 58,
    });
  });

  test("a save writes both fields under their store keys", async () => {
    const { entries, layer } = setup();
    const chosen: Printer = { name: "EPSON TM-T20", width: 58 };

    await run(layer, (printer) => printer.set(chosen));

    expect(entries.get("printer_name")).toBe("EPSON TM-T20");
    expect(entries.get("printer_width")).toBe(58);
    expect(await run(layer, (printer) => printer.get())).toEqual(chosen);
  });

  test("a width that cannot lay out a receipt falls back to 80 mm", async () => {
    for (const width of [0, -58, Number.NaN, Number.POSITIVE_INFINITY, "58", null]) {
      const { layer } = setup({ printer_width: width });
      expect((await run(layer, (printer) => printer.get())).width).toBe(80);
    }
  });

  test("a name that is not text falls back to no printer", async () => {
    const { layer } = setup({ printer_name: 5 });
    expect((await run(layer, (printer) => printer.get())).name).toBe("");
  });

  test("`changes` replays the value just saved", async () => {
    const { layer } = setup();
    const chosen: Printer = { name: "EPSON TM-T20", width: 58 };

    const head = await run(layer, (printer) =>
      Effect.gen(function* () {
        yield* printer.set(chosen);
        return yield* Stream.runHead(printer.changes);
      }),
    );

    expect(head._tag).toBe("Some");
    if (head._tag === "Some") expect(head.value).toEqual(chosen);
  });
});
