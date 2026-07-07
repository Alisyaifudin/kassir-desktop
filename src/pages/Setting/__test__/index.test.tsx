import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { settingRouteEffect } from "../index";
import { UserService } from "~/services/user";
import { CashierService } from "~/services/cashier";
import { HashService } from "~/services/hash";
import { SonnerService } from "~/services/sonner";
import { ConfigService } from "~/services/config";
import { InfoService } from "~/services/info";
import { LogService } from "~/services/log";
import { PrinterService } from "~/services/print";

function makeUserService(): typeof UserService.Service {
  return {
    loader: () => Effect.void,
    useUser: () => ({ name: "Budi", role: "admin", id: "1" }),
    user: { name: "Budi", role: "admin", id: "1" },
    setUser: () => Effect.void,
    logout: () => {},
    login: () => {},
  };
}

function makeCashierService(): typeof CashierService.Service {
  return {
    loader: () => Effect.void,
    useCashiers: () => [],
    add: () => Effect.succeed({ name: "Budi", role: "admin", id: "1" }),
    delete: () => Effect.void,
    set: { name: () => Effect.void, hash: () => Effect.void, role: () => Effect.void },
    get: {
      all: () => Effect.succeed([]),
      byId: () => Effect.succeed({ name: "Budi", role: "admin", id: "1", hash: "xxx" }),
    },
  };
}

describe("settingRouteEffect", () => {
  test("resolves with route path 'setting'", () => {
    const program = Effect.gen(function* () {
      const route = yield* settingRouteEffect;
      expect(route.path).toBe("setting");
      expect(route.children).toBeDefined();
    });
    const layer = Layer.mergeAll(
      Layer.succeed(UserService, makeUserService()),
      Layer.succeed(CashierService, makeCashierService()),
      Layer.succeed(HashService, { hash: () => Effect.succeed("x"), verify: () => Effect.void }),
      Layer.succeed(SonnerService, { error: () => {}, success: () => {} }),
      Layer.succeed(ConfigService, {
        size: { useSize: () => "big", set: () => {} },
        theme: { useTheme: () => "light", set: () => {} },
      }),
      Layer.succeed(InfoService, {
        loader: () => Effect.void,
        showCashier: { useShowCashier: () => true, set: () => Effect.void },
        info: {
          useInfo: () => ({ name: "", address: "", header: "", footer: "" }),
          useName: () => "",
          set: () => Effect.void,
        },
      }),
      Layer.succeed(LogService, {
        put: () => {},
        loader: () => Effect.void,
        useLog: () => [],
        clear: () => Effect.void,
      }),
      Layer.succeed(PrinterService, {
        testPrint: () => Effect.void,
        print: () => Effect.void,
        loader: () => Effect.void,
        size: { useSize: () => 80, set: () => Effect.void },
        printer: {
          usePrinter: () => null,
          usePrinters: () => [],
          set: () => Effect.void,
        },
      }),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});
