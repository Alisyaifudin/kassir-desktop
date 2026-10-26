import { Component, type ComponentType, type ReactNode } from "react";

type AnyErrorConstructor = new (...args: never[]) => Error;

type ErrorBoundaryFallbackProps<E> = {
  error: E;
};

type ErrorBoundaryProps<E> = {
  children: ReactNode;
  /** Rendered when a matching error is thrown. Receives the typed error. */
  fallback: ComponentType<ErrorBoundaryFallbackProps<E>>;
};

/**
 * Builds the boundary class for a concrete constructor list. Keeping this in a
 * plain generic function (instead of inlining it in the public factories) means
 * `E` is always the *same* type variable the props use, so the returned class
 * stays assignable to `ComponentType<ErrorBoundaryProps<E>>`.
 */
function createBoundary<E extends Error>(
  classes: readonly (new (...args: never[]) => E)[],
): ComponentType<ErrorBoundaryProps<E>> {
  type State = { error: unknown };

  class ErrorBoundary extends Component<ErrorBoundaryProps<E>, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: unknown): State {
      return { error };
    }

    render() {
      const { error } = this.state;

      if (error === null || error === undefined) return this.props.children;

      // Not our error — rethrow so an ancestor boundary can handle it.
      if (!classes.some((ErrorClass) => error instanceof ErrorClass)) throw error;

      const Fallback = this.props.fallback;
      return <Fallback error={error as E} />;
    }
  }

  return ErrorBoundary;
}

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
  return createBoundary<E>(classes as unknown as readonly (new (...args: never[]) => E)[]);
}

/** Single-error convenience wrapper around {@link createManyErrorBoundary}. */
export function createErrorBoundary<E extends Error>(
  ErrorClass: new (...args: never[]) => E,
): ComponentType<ErrorBoundaryProps<E>> {
  return createBoundary([ErrorClass]);
}
