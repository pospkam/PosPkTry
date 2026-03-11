'use client';

import React from 'react';
import Link from 'next/link';
import { Reveal } from '@/components/homepage/Reveal';

const FP = "var(--font-playfair,'Playfair Display',Georgia,serif)";
const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

export function CTASection() {
  return (
    <section
      style={{
        padding: '40px 20px 110px',
        textAlign: 'center',
      }}
    >
      <Reveal>
        <h2
          style={{
            fontFamily: FP,
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--kh-text)',
            marginBottom: '8px',
          }}
        >
          Готов к поездке?
        </h2>
      </Reveal>

      <Reveal delay={1}>
        <p
          style={{
            fontFamily: FO,
            fontSize: '12px',
            color: 'var(--kh-text-dim)',
            marginBottom: '24px',
          }}
        >
          Туры от проверенных операторов Камчатки
        </p>
      </Reveal>

      <Reveal delay={2}>
        <Link
          href="/tours"
          style={{
            display: 'inline-block',
            fontFamily: FO,
            fontSize: '13px',
            fontWeight: 600,
            padding: '12px 32px',
            borderRadius: '100px',
            border: '2px solid var(--kh-accent)',
            background: 'transparent',
            color: 'var(--kh-accent)',
            textDecoration: 'none',
            transition: 'background 0.2s, color 0.2s, transform 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--kh-accent)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--kh-accent)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => { (e.currentTarget.style.transform = 'scale(0.96)'); }}
          onMouseUp={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
        >
          Начать поиск
        </Link>
      </Reveal>
    </section>
  );
}
