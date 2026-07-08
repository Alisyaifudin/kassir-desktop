import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { Temporal } from "temporal-polyfill";
import { ProductService } from "~/services/product";
import { RecordService } from "~/services/record";
import { IoService } from "~/services/io";
import { BlobService } from "~/services/blob";
import { DateService } from "~/services/date";
import page from "../page";
import { render } from "~/lib/render";

function makeProductService(): typeof ProductService.Service {
  return { get: { all: () => Effect.succeed([]) } } as typeof ProductService.Service;
}

function makeRecordService(): typeof RecordService.Service {
  return { get: { range: () => Effect.succeed([]) } } as typeof RecordService.Service;
}

function makeIoService(): typeof IoService.Service {
  return {
    dialog: () => Effect.succeed("/tmp/test.json"),
    save: () => Effect.void,
  } as typeof IoService.Service;
}

function makeBlobService(): typeof BlobService.Service {
  return { convert: { fromObject: () => Effect.succeed(new Uint8Array()) } } as typeof BlobService.Service;
}

function makeDateService(): typeof DateService.Service {
  return {
    now: () => Date.now(),
    todayDate: () => Temporal.Now.plainDateISO(),
    timeZoneId: () => Temporal.Now.timeZoneId(),
    today: { str: () => "" },
  };
}

describe("page (Effect)", () => {
  test("resolves when all services are provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.mergeAll(
      Layer.succeed(ProductService, makeProductService()),
      Layer.succeed(RecordService, makeRecordService()),
      Layer.succeed(IoService, makeIoService()),
      Layer.succeed(BlobService, makeBlobService()),
      Layer.succeed(DateService, makeDateService()),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

describe("Page component", () => {
  function renderPage() {
    const Page = Effect.runSync(
      page.pipe(
        Effect.provideService(ProductService, makeProductService()),
        Effect.provideService(RecordService, makeRecordService()),
        Effect.provideService(IoService, makeIoService()),
        Effect.provideService(BlobService, makeBlobService()),
        Effect.provideService(DateService, makeDateService()),
      ),
    );
    return render(<Page />);
  }

  test("renders heading and description", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /kelola data/i })).not.toBeNull();
    expect(screen.getByText(/unduh dan unggah data aplikasi/i)).not.toBeNull();
  });

  test("renders 'Unduh Data' section", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /unduh data/i })).not.toBeNull();
  });

  test("renders 'Unggah Data' section", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /unggah data/i })).not.toBeNull();
  });

  test("renders download buttons", () => {
    renderPage();
    // Both download and upload sections have "Produk" and "Riwayat" headings
    const headings = screen.getAllByRole("heading", { name: "Produk" });
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("heading", { name: "Riwayat" }).length).toBeGreaterThanOrEqual(1);
  });
});
