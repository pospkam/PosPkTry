'use client';

import React from 'react';
import { useInView } from '@/hooks/useInView';

interface RevealProps {
  children: React.ReactNode;
  delay?: 1 | 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
}

export function Reveal({ children, delay, className = '', style }: RevealProps) {
  const [ref, vis] = useInView();
  return (
    <div
      ref={ref}
      className={`kh-reveal ${vis ? 'kh-visible' : ''} ${delay ? `kh-reveal-d${delay}` : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
