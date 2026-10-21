'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook de proteção contra cliques duplos / submissão concorrente.
 * Mantém um lock por no mínimo `lockMs` (padrão 900ms) ou durante a execução da Promise async.
 */
export function useSubmitLock(lockMs: number = 900) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLockedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const runWithLock = useCallback(
    async <T,>(action: () => Promise<T> | T): Promise<T | undefined> => {
      if (isLockedRef.current) {
        return undefined;
      }

      isLockedRef.current = true;
      setIsSubmitting(true);

      try {
        const result = await action();
        return result;
      } finally {
        timeoutRef.current = setTimeout(() => {
          isLockedRef.current = false;
          setIsSubmitting(false);
        }, lockMs);
      }
    },
    [lockMs]
  );

  return {
    isSubmitting,
    runWithLock,
  };
}
