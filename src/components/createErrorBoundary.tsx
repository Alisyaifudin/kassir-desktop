import { Component, type ComponentType, type ReactNode } from "react";

export type ErrorBoundaryFallbackProps<E> = {
  error: E;
};

export type ErrorBoundaryProps<E> = {
  children: ReactNode;
  /** Rendered when an error of the given type is thrown. Receives the typed error. */
  fallback: ComponentType<ErrorBoundaryFallbackProps<E>>;
};

/**
 * Builds a React error boundary for a specific `Data.TaggedError` subclass.
 *
 * ```tsx
 * const CashierErrorBoundary = createErrorBoundary(CashierError);
 *
 * function CashierErrorView({ error }: { error: CashierError }) {
 *   return <ErrorComponent title="Gagal memuat kasir">{error.message}</ErrorComponent>;
 * }
 *
 * <CashierErrorBoundary fallback={CashierErrorView}>
 *   <CashierList />
 * </CashierErrorBoundary>
 * ```
 *
 * The fallback is typed with the exact error class. Errors of any other type are
 * rethrown so an ancestor boundary can handle them.
 */
export function createErrorBoundary<E extends Error>(
  ErrorClass: new (...args: never[]) => E,
): ComponentType<ErrorBoundaryProps<E>> {
  type State = { error: E | null };

  class ErrorBoundary extends Component<ErrorBoundaryProps<E>, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: unknown): State {
      return { error: error as E };
    }

    render() {
      const { error } = this.state;

      if (error === null) return this.props.children;

      // Not our error — rethrow so an ancestor boundary can handle it.
      if (!(error instanceof ErrorClass)) throw error;

      const Fallback = this.props.fallback;
      return <Fallback error={error} />;
    }
  }

  return ErrorBoundary;
}
