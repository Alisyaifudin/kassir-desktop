import { Either } from "effect";
import React, { useState } from "react";

export function useSubmit<E, A>(
  submit: (e: React.FormEvent<HTMLFormElement>) => Promise<Either.Either<A, E>>,
  onSuccess?: (res: A) => void,
): {
  loading: boolean;
  error: E | null;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function useSubmit<E>(
  submit: (e: React.FormEvent<HTMLFormElement>) => Promise<E | null>,
  onSuccess?: () => void,
): {
  loading: boolean;
  error: E | null;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function useSubmit<E, A = never>(
  submit: (e: React.FormEvent<HTMLFormElement>) => Promise<Either.Either<A, E>> | Promise<E | null>,
  onSuccess?: (res?: A) => void,
): {
  loading: boolean;
  error: E | null;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | E>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await submit(e);
    setLoading(false);

    if (Either.isEither(res)) {
      Either.match(res, {
        onLeft(left) {
          setError(left);
        },
        onRight(right) {
          setError(null);
          onSuccess?.(right);
        },
      });
    } else {
      setError(res);
      if (res === null) {
        onSuccess?.();
      }
    }
  }

  return { loading, error, handleSubmit };
}
