'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Bot, ArrowRight } from 'lucide-react';

const HERO_LIGHT = '/images/hero/hero-light.jpeg';
const HERO_DARK  = '/images/hero/hero-dark.jpeg';

export function HeroCompact() {
  return (
    <section className="relative overflow-hidden bg-[#0D0C0B]" style={{ minHeight: '100svh' }}>
      {/* Full-bleed background */}
      <Image
        src={HERO_LIGHT}
        alt="Камчатка"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center dark:opacity-0 transition-opacity duration-700"
      />
      <Image
        src={HERO_DARK}
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="object-cover object-center opacity-0 dark:opacity-100 transition-opacity duration-700"
      />

      {/* Dark veil — top heavy */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/75" />

      {/* ── Oversized BG letter — decorative ── */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
      >
        <span
          className="font-playfair font-bold text-white/[0.04] leading-none"
          style={{ fontSize: 'clamp(18rem, 40vw, 52rem)' }}
        >
          К
        </span>
      </div>

      {/* ── Layout grid ── */}
      <div className="relative z-10 flex flex-col h-full min-h-[100svh] max-w-7xl mx-auto px-6 md:px-10">

        {/* Top bar */}
        <div className="flex items-center justify-between pt-24 md:pt-28">
          <span className="text-[10px] tracking-[0.25em] font-medium uppercase text-white/40">
            Камчатка · 2026
          </span>
          <span className="text-[10px] tracking-[0.25em] font-medium uppercase text-white/40">
            53°N 158°E
          </span>
        </div>

        {/* Main editorial text block */}
        <div className="flex-1 flex flex-col justify-center py-12">
          {/* Category label */}
          <div className="flex items-center gap-3 mb-8">
            <span className="w-8 h-px bg-white/30" />
            <span className="text-[11px] tracking-[0.3em] uppercase font-medium text-white/50">
              AI-платформа туризма
            </span>
            <span className="inline-flex items-center gap-1.5 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="text-[10px] text-white/40 tracking-wider uppercase">Online</span>
            </span>
          </div>

          {/* Giant headline — editorial split */}
          <div className="mb-10">
            <h1
              className="font-playfair font-bold text-white leading-[0.92] tracking-tight"
              style={{ fontSize: 'clamp(3.5rem, 9vw, 8.5rem)' }}
            >
              Дикая.
            </h1>
            <h1
              className="font-playfair font-bold leading-[0.92] tracking-tight"
              style={{
                fontSize: 'clamp(3.5rem, 9vw, 8.5rem)',
                color: 'transparent',
                WebkitTextStroke: '1px rgba(255,255,255,0.35)',
              }}
            >
              Настоящая.
            </h1>
            <h1
              className="font-playfair font-bold leading-[0.92] tracking-tight"
              style={{ fontSize: 'clamp(3.5rem, 9vw, 8.5rem)', color: 'var(--accent)' }}
            >
              Умная.
            </h1>
          </div>

          {/* Sub-text + CTA in a horizontal row */}
          <div className="flex flex-col md:flex-row md:items-end gap-8 md:gap-16">
            <p className="text-white/55 text-sm md:text-base leading-relaxed max-w-xs font-light">
              Первая в России туристическая платформа&nbsp;с&nbsp;AI‑оператором,
              13-ю&nbsp;цифровыми директорами и&nbsp;SAR‑мониторингом.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#chat"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: 'var(--accent)', boxShadow: '0 0 32px rgba(212,74,12,0.45)' }}
              >
                <Bot className="w-4 h-4" />
                Спросить Кузьмича
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <Link
                href="/routes"
                className="text-sm text-white/50 hover:text-white/90 transition-colors underline underline-offset-4"
              >
                Все маршруты
              </Link>
            </div>
          </div>
        </div>

        <div className="pb-10" />
      </div>
    </section>
  );
}
