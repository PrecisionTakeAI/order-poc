import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export interface UseApiResult<T, P extends unknown[]> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: P) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T, P extends unknown[]>(
  apiFunction: (...args: P) => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiResult<T, P> {
  const { immediate = false, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      try {
        // Cancel previous request if still pending
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        const result = await apiFunction(...args);

        if (isMountedRef.current) {
          setData(result);
          setLoading(false);
          onSuccess?.(result);
        }

        return result;
      } catch (err) {
        if (isMountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          setLoading(false);
          onError?.(errorMessage);
        }
        return null;
      }
    },
    [apiFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as P));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, execute, reset };
}
