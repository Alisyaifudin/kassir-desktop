import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Effect, Layer } from "effect";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { makeTestDatabase } from "~/services/db/test-support";
import { makeTestLocalStorage } from "~/services/local-storage/test-support";
import { makeTestStore } from "~/services/store/test-support";
import { buildAppLive, makeService } from "~/services/wiring";

/**
 * Setting → Toko, integrated: the real info service, the real form and the real
 * store behind it. This is a *write* path — the read paths have their own tests —
 * and the write is the part nobody wants wrong: the panel edits four text fields
 * at once, and `patchInfo` reads the current info before writing so it cannot
 * blank the fields the form is not showing (the shop's name, the cashier toggle).
 */
const { layer: dbLayer } = makeTestDatabase();
const storage = makeTestLocalStorage();
// The store is the real backend here, seeded as a previous run left it.
const store = makeTestStore({ name: "Kassir", owner: "Toko Lama" });

const service = makeService(
  buildAppLive(Layer.mergeAll(dbLayer, store.layer, storage.layer)),
);

mock.module("~/services", () => ({ service }));

const Page = (await import("~/pages/Setting/Shop/page")).default;

const owner = () => screen.getByLabelText("Nama Toko") as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole("button", { name: /Simpan/ }));

beforeEach(() => {
  // The first test reads this state; the second moves it on deliberately.
  store.entries.set("name", "Kassir");
  store.entries.set("owner", "Toko Lama");
});

describe("the shop form over the real services", () => {
  test("opens with what the store holds, and typing alone writes nothing", async () => {
    render(<Page />);
    await waitFor(() => expect(owner().value).toBe("Toko Lama"));

    fireEvent.change(owner(), { target: { value: "Belum disimpan" } });

    expect(store.entries.get("owner")).toBe("Toko Lama");
  });

  test("saving writes the field through the service, and a later save replaces it", async () => {
    render(<Page />);
    await waitFor(() => expect(owner().value).toBe("Toko Lama"));

    fireEvent.change(owner(), { target: { value: "Warung Bu Tini" } });
    save();
    await waitFor(() => expect(store.entries.get("owner")).toBe("Warung Bu Tini"));
    // The fields the panel does not show are written back, not dropped.
    expect(store.entries.get("name")).toBe("Kassir");

    fireEvent.change(owner(), { target: { value: "Warung Bu Tini 2" } });
    save();
    await waitFor(() => expect(store.entries.get("owner")).toBe("Warung Bu Tini 2"));

    // The write is visible to the service itself, without a reload.
    const info = await Effect.runPromise(service.info.info());
    expect(info.owner).toBe("Warung Bu Tini 2");
    expect(info.name).toBe("Kassir");
  });
});
