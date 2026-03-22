'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ApiFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

interface UseApiFetchOptions {
  /** Error message shown to the user on failure */
  errorMessage?: string;
  /** Skip automatic fetch on mount (call refetch manually) */
  skip?: boolean;
}

interface UseApiFetchResult<T> extends ApiFetchState<T> {
  /** Manually trigger a (re)fetch */
  refetch: () => Promise<void>;
  /** Update data locally without refetching */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Hook for fetching data from internal API routes that follow
 * the `{ success: boolean; data?: T; error?: string }` convention.
 *
 * Replaces the repeated useState+useEffect+fetch pattern across 28+ client components.
 *
 * @param url  - API route path, e.g. "/api/tourist/wishlist"
 * @param transform - Optional function to reshape response `data` before storing
 * @param options - Optional config (errorMessage, skip)
 */
export function useApiFetch<TRaw = unknown, T = TRaw>(
  url: string,
  transform?: (raw: TRaw) => T,
  options?: UseApiFetchOptions,
): UseApiFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Ошибка загрузки');
      }
      if (!mountedRef.current) return;
      const raw = json.data as TRaw;
      setData(transform ? transform(raw) : (raw as unknown as T));
    } catch {
      if (!mountedRef.current) return;
      setError(options?.errorMessage ?? 'Не удалось загрузить данные');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [url, transform, options?.errorMessage]);

  useEffect(() => {
    mountedRef.current = true;
    if (!options?.skip) {
      doFetch();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [doFetch, options?.skip]);

  return { data, loading, error, refetch: doFetch, setData };
}
