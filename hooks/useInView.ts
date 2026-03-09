'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * useInView — обёртка над IntersectionObserver.
 * Возвращает [ref, isVisible].
 * Как только элемент попадает во viewport (threshold) — isVisible = true (sticky).
 */
export function useInView(options?: IntersectionObserverInit): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // once — не сбрасывать при уходе из viewport
        }
      },
      { threshold: 0.15, ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return [ref, isVisible];
}
