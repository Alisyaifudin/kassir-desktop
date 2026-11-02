import { Effect, Stream } from "effect";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useStream } from "~/components/Loader";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { service } from "~/services";
import type { SyncConfig } from "~/services/sync";

/** A merge needs both halves: an endpoint to call and a token to call it with. */
function isConfigured(config: SyncConfig): boolean {
  return config.baseUrl.trim() !== "" && config.token.trim() !== "";
}

/** What the last Cek did, rendered inline next to the buttons. */
type CheckResult = { ok: boolean; message: string };

/**
 * The server this device syncs with (contract §10).
 *
 * The values live in `store.json` under `sync.base_url` / `sync.token` — the same
 * store the cursors use. There is no account and no login: one token protects the
 * whole endpoint, and the desktop is its only participant.
 *
 * The address is an operator setting, seeded with `SYNC_DEFAULT_BASE_URL`: a shop
 * running its own backend points the till at it without a rebuild, and a fresh
 * install has the public server already filled in.
 *
 * The token is rendered as a password field but is not masked in the store: it is
 * a shared secret for a single-tenant endpoint, and hiding it on screen while
 * leaving it in cleartext on disk would be security theatre.
 *
 * `Cek` asks the server at the address in the field (`GET /v2/health`, with the
 * token in the field) whether both halves work *before* they are saved, so a typo
 * is caught without writing it to disk first. The answer is rendered inline; a
 * failure is the server's own sentence, not a generic "gagal".
 */
export function ServerForm({
  onConfigured,
}: {
  /** Reports whether a server + token are stored, so the run button can gate on it. */
  onConfigured?: (configured: boolean) => void;
}) {
  const loaded = useQuery(() => Stream.fromEffect(service.sync.config.get()), []);
  const [form, setForm] = useState<SyncConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seed the fields once the stored config arrives, without fighting later edits.
  useEffect(() => {
    if (loaded.type === "success" && form === null) {
      setForm(loaded.data);
      onConfigured?.(isConfigured(loaded.data));
    }
  }, [loaded, form, onConfigured]);

  if (form === null) return <Spinner when />;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (form === null) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const outcome = await Effect.runPromise(
      service.sync.config.set(form).pipe(Effect.either),
    );
    setSaving(false);
    if (outcome._tag === "Left") {
      setError(outcome.left.message);
    } else {
      setSaved(true);
      onConfigured?.(isConfigured(form));
    }
  }

  async function verify() {
    if (form === null) return;
    setChecking(true);
    setError(null);
    // The previous answer belongs to the previous fields, so it goes before the
    // request rather than sitting there looking current while the new one runs.
    setCheck(null);
    const outcome = await Effect.runPromise(service.sync.check(form).pipe(Effect.either));
    setChecking(false);
    if (outcome._tag === "Left") {
      setCheck({ ok: false, message: outcome.left.message });
      return;
    }
    const { status, message } = outcome.right;
    setCheck({
      ok: true,
      message:
        message === "" ? `Server sehat (${status})` : `Server sehat (${status}) — ${message}`,
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <label className="grid grid-cols-1 gap-1 text-base sm:grid-cols-[140px_1fr] sm:items-center sm:gap-2">
        <span>Alamat server</span>
        <Input
          value={form.baseUrl}
          onChange={(event) => {
            const baseUrl = event.currentTarget.value;
            setSaved(false);
            // A check is about one endpoint; editing either field invalidates it.
            setCheck(null);
            setForm({ ...form, baseUrl });
          }}
          placeholder="https://kassir.example.workers.dev"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <label className="grid grid-cols-1 gap-1 text-base sm:grid-cols-[140px_1fr] sm:items-center sm:gap-2">
        <span>Token</span>
        <Input
          type="password"
          value={form.token}
          onChange={(event) => {
            const token = event.currentTarget.value;
            setSaved(false);
            setCheck(null);
            setForm({ ...form, token });
          }}
          placeholder="kst_…"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={saving}>
          Simpan <Spinner when={saving} />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={verify}
          disabled={checking || !isConfigured(form)}
        >
          Cek <Spinner when={checking} />
        </Button>
        {saved ? <p className="text-sm text-muted-foreground">Tersimpan</p> : null}
      </div>
      <TextError>{error}</TextError>
      {check === null ? null : (
        <p
          role={check.ok ? "status" : "alert"}
          className={
            check.ok
              ? "flex items-center gap-2 text-sm text-emerald-600"
              : "flex items-center gap-2 text-sm text-red-500"
          }
        >
          {check.ok ? (
            <CircleCheck className="size-4 shrink-0" />
          ) : (
            <CircleAlert className="size-4 shrink-0" />
          )}
          {check.message}
        </p>
      )}
    </form>
  );
}

/** The pull cursor, read once per mount (it only moves while a run is active). */
export function CursorLine() {
  const cursor = useStream(Stream.fromEffect(service.sync.cursor()));
  const value = cursor.type === "success" ? cursor.data : null;
  return (
    <p className="text-sm text-muted-foreground">
      {value === null ? "Belum pernah sinkron" : `Terakhir menerima sampai urutan ${value}`}
    </p>
  );
}
