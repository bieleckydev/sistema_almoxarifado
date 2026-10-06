'use client';

import { useState, useEffect } from 'react';

/**
 * Hook customizado de debounce para atrasar a atualização de um valor
 * até que um determinado intervalo de inatividade transcorra (padrão: 300ms).
 * Ideal para otimizar inputs de busca evitando filtragens excessivas a cada tecla digitada.
 *
 * @param value Valor a ser monitorado
 * @param delay Tempo de espera em milissegundos (padrão: 300ms)
 * @returns O valor atrasado (debounced)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
