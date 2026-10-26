import { useEffect } from "react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Button } from "./ui/button";
import { Unauthenticated } from "~/lib/auth";
import Redirect from "./Redirect";
import { AlertTriangle, ArrowLeft, Home, Terminal, ShieldAlert, FileQuestion } from "lucide-react";
import { log } from "~/lib/log";
import { cn } from "~/lib/utils";

/** Stringify even circular / BigInt values without throwing. */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function logError(error: unknown) {
  log.error(error instanceof Error ? error : safeStringify(error));
}

export default function ErrorBoundary() {
  const env = import.meta.env.DEV;
  const error = useRouteError();

  // Record failures once so production issues are diagnosable.
  useEffect(() => {
    logError(error);
  }, [error]);

  // Unauthenticated → login (hard reset clears the cached user).
  if (error instanceof Unauthenticated) {
    return <Redirect to="/login" hard />;
  }

  const reloadPage = () => window.location.reload();
  const goBack = () => window.history.back();

  let errorTitle = "Terjadi Kesalahan";
  let errorMessage = "Aplikasi mengalami kendala yang tidak terduga.";
  let errorStatus: number | null = null;
  let technicalDetails: string | null = null;
  let Icon = AlertTriangle;
  let iconColor = "text-destructive";

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    // `data` can be a non-string (e.g. `json({...})`) — never render objects.
    errorMessage =
      (typeof error.data === "string" && error.data) || error.statusText || errorMessage;
    if (error.status === 404) {
      errorTitle = "Halaman Tidak Ditemukan";
      errorMessage = "Maaf, halaman yang Anda cari tidak dapat ditemukan.";
      Icon = FileQuestion;
      iconColor = "text-amber-500";
    } else if (error.status === 403) {
      errorTitle = "Akses Ditolak";
      errorMessage = "Anda tidak memiliki izin untuk mengakses halaman ini.";
      Icon = ShieldAlert;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
    technicalDetails = error.stack || null;
  } else {
    technicalDetails = safeStringify(error);
  }

  return (
    <main className="min-h-svh w-full grid place-items-center p-6 bg-background overflow-y-auto selection:bg-primary/10">
      <div className="max-w-3xl w-full flex flex-col items-center text-center gap-10 py-12">
        {/* Icon - Minimal */}
        <Icon className={cn("w-16 h-16 shrink-0", iconColor)} />

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-big font-bold tracking-tight text-foreground">
            {errorStatus && (
              <span className="text-muted-foreground mr-2 font-mono text-normal">[{errorStatus}]</span>
            )}
            {errorTitle}
          </h1>
          <p className="text-muted-foreground text-normal leading-relaxed">{errorMessage}</p>
        </div>

        {/* Action Buttons - Pure Flat */}
        <div className="flex flex-col gap-3 w-full max-w-xs shrink-0">
          <Button onClick={reloadPage} className="h-12 text-normal font-bold tracking-wide uppercase">
            Muat Ulang
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={goBack} className="h-11 font-semibold">
              <ArrowLeft className="icon mr-2" />
              Kembali
            </Button>

            <Button variant="ghost" asChild className="h-11 font-semibold">
              <Link to="/">
                <Home className="icon mr-2" />
                Home
              </Link>
            </Button>
          </div>
        </div>

        {/* Technical Details - Plain (DEV Only) */}
        {env && technicalDetails && (
          <div className="w-full mt-4 pt-8 border-t text-left">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Terminal className="icon" />
              <span className="text-small font-bold uppercase tracking-widest text-foreground/50">
                Detail Teknis (Dev Tool)
              </span>
            </div>
            <pre className="p-4 bg-muted/40 rounded-lg text-normal font-mono overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all max-h-[300px] text-muted-foreground/80 border leading-relaxed">
              {technicalDetails}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
