"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

/** Presets de delay reutilizáveis (busca, digitação rápida, etc.). */
export const DEBOUNCE_MS = {
  default: 300,
  search: 300,
  fast: 150,
  slow: 500,
} as const;

export type UseDebounceOptions = {
  delayMs?: number;
  /** String: valor debounced passa por `trim()`. Recomendado em campos de busca. */
  trim?: boolean;
};

function normalize<T>(value: T, trim: boolean): T {
  if (trim && typeof value === "string") {
    return (value as string).trim() as T;
  }
  return value;
}

/**
 * Valor que só muda após `delayMs` sem alterações em `value` (trailing edge).
 * Para inputs de filtro, prefira `useDebouncedState` ou `{ trim: true }`.
 */
export function useDebounce(value: string, options: UseDebounceOptions & { trim: true }): string;
export function useDebounce<T>(value: T, options?: UseDebounceOptions): T;
export function useDebounce<T>(value: T, options?: UseDebounceOptions): T {
  const delayMs = options?.delayMs ?? DEBOUNCE_MS.default;
  const trim = Boolean(options?.trim && typeof value === "string");

  const [debounced, setDebounced] = useState<T>(() => normalize(value, trim));

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(normalize(value, trim));
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs, trim]);

  return debounced;
}

/**
 * Par `[valor imediato, valor debounced, setValue]` para inputs de busca/filtro.
 * Equivale a `useState` + `useDebounce` com a mesma API de opções.
 */
export function useDebouncedState(
  initialValue: string,
  options?: UseDebounceOptions,
): readonly [string, string, Dispatch<SetStateAction<string>>] {
  const [value, setValue] = useState(initialValue);
  const debounced = useDebounce(value, options);
  return [value, debounced, setValue] as const;
}

/**
 * Retorna uma função que executa `callback` só após `delayMs` sem novas chamadas.
 * Útil para salvar rascunho, resize, etc. (não substitui `useDebounce` para valor de input).
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number = DEBOUNCE_MS.default,
): (...args: Args) => void {
  const cbRef = useRef(callback);
  /** DOM retorna `number`; tipos Node usam `Timeout` — manter `number` evita conflito no `tsc`. */
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = undefined;
        cbRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  );
}
