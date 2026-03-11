'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { Reveal } from '@/components/homepage/Reveal';

const FP = "var(--font-playfair,'Playfair Display',Georgia,serif)";
const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

interface HeroProps {
  scrollY: number;
}

export function Hero({ scrollY }: HeroProps) {
  const { isDark } = useTheme();
  const heroSrc = isDark ? '/images/hero/hero-dark.jpg' : '/images/hero/hero-light.jpg';

  return (
    <section
      style={{
        position: 'relative',
        height: '52vh',
        minHeight: '360px',
        overflow: 'hidden',
      }}
    >
      {/* Photo */}
      <img
        src={heroSrc}
        alt="Камчатка"
        loading="eager"
        fetchPriority="high"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 30%',
          transform: `translateY(${scrollY * 0.1}px)`,
          willChange: 'transform',
        }}
      />

      {/* Top gradient (dark theme only for readability) */}
      {isDark && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(26,23,20,0.4), transparent 40%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Bottom gradient — blend into page */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: `linear-gradient(to top, var(--kh-bg), transparent)`,
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '60px 20px 40px',
          textAlign: 'center',
        }}
      >
        <Reveal>
          <p
            style={{
              fontFamily: FO,
              fontSize: '10px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '3px',
              color: isDark ? 'rgba(240,237,232,0.7)' : 'var(--kh-text-dim)',
              marginBottom: '12px',
            }}
          >
            55°N · Камчатский край
          </p>
        </Reveal>

        <Reveal delay={1}>
          <h1
            style={{
              fontFamily: FP,
              fontSize: '32px',
              fontWeight: 700,
              lineHeight: 1.15,
              color: isDark ? '#F0EDE8' : 'var(--kh-text)',
              textShadow: isDark ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
              margin: '0 0 8px',
            }}
          >
            Здесь начинается<br />Россия
          </h1>
        </Reveal>

        <Reveal delay={2}>
          <p
            style={{
              fontFamily: FP,
              fontSize: '14px',
              fontStyle: 'italic',
              color: isDark ? 'rgba(240,237,232,0.6)' : 'var(--kh-text-dim)',
              marginBottom: '24px',
            }}
          >
            Камчатка — земля огня и льда
          </p>
        </Reveal>

        <Reveal delay={3}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/tours"
              style={{
                fontFamily: FO,
                fontSize: '13px',
                fontWeight: 600,
                padding: '10px 24px',
                borderRadius: '100px',
                background: 'var(--kh-accent)',
                color: '#fff',
                textDecoration: 'none',
                boxShadow: '0 4px 16px var(--kh-accent-glow)',
                transition: 'transform 0.15s',
              }}
              onMouseDown={(e) => { (e.currentTarget.style.transform = 'scale(0.96)'); }}
              onMouseUp={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
            >
              Исследовать
            </Link>
            <Link
              href="/search"
              style={{
                fontFamily: FO,
                fontSize: '13px',
                fontWeight: 500,
                padding: '10px 24px',
                borderRadius: '100px',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                color: isDark ? '#F0EDE8' : 'var(--kh-text)',
                textDecoration: 'none',
                transition: 'transform 0.15s',
              }}
              onMouseDown={(e) => { (e.currentTarget.style.transform = 'scale(0.96)'); }}
              onMouseUp={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
            >
              ✦ AI-подбор
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
