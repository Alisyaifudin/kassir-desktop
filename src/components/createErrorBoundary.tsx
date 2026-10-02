import { Component, type ComponentType, type ReactNode } from "react";

type AnyErrorConstructor = new (...args: never[]) => Error;

export type ErrorBoundaryFallbackProps<E> = {
  error: E;
};

export type ErrorBoundaryProps<E> = {
  children: ReactNode;
  /** Rendered when a matching error is thrown. Receives the typed error. */
  fallback: ComponentType<ErrorBoundaryFallbackProps<E>>;
};

/**
 * Builds a React error boundary that catches any of the given
 * `Data.TaggedError` subclasses. The fallback receives the union of their
 * instance types.
 *
 * ```tsx
 * const LoginErrorBoundary = createManyErrorBoundary(AuthError, CashierError);
 *
 * function LoginError({ error }: { error: AuthError | CashierError }) { ... }
 *
 * <LoginErrorBoundary fallback={LoginError}>{children}</LoginErrorBoundary>
 * ```
 *
 * Errors of any other type are rethrown so an ancestor boundary can handle them.
 */
export function createManyErrorBoundary<const Classes extends readonly AnyErrorConstructor[]>(
  ...classes: Classes
): ComponentType<ErrorBoundaryProps<InstanceType<Classes[number]>>> {
  type E = InstanceType<Classes[number]>;
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
      if (!classes.some((ErrorClass) => error instanceof ErrorClass)) throw error;

      const Fallback = this.props.fallback;
      return <Fallback error={error} />;
    }
  }

  return ErrorBoundary;
}

/** Single-error convenience wrapper around {@link createManyErrorBoundary}. */
export function createErrorBoundary<E extends Error>(
  ErrorClass: new (...args: never[]) => E,
): ComponentType<ErrorBoundaryProps<E>> {
  return createManyErrorBoundary(ErrorClass);
}
