'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Bot, Shield, Leaf, Users, ArrowRight, ChevronDown } from 'lucide-react';

const HERO_LIGHT = '/images/hero/hero-light.jpeg';
const HERO_DARK  = '/images/hero/hero-dark.jpeg';

const PILLS = [
  { icon: Bot,    label: 'AI-оператор Кузьмич' },
  { icon: Users,  label: '10 AI агентов' },
  { icon: Shield, label: 'SAR Rescue 24/7' },
  { icon: Leaf,   label: 'Eco-мониторинг' },
];

export function HeroCompact() {
  return (
    <section className="relative flex items-end overflow-hidden" style={{ minHeight: '82svh' }}>
      {/* Background */}
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
        alt="Камчатка"
        fill
        sizes="100vw"
        className="object-cover object-center opacity-0 dark:opacity-100 transition-opacity duration-700"
      />

      {/* Gradient — stronger at bottom where text lives */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/10" />

      {/* Content — left-aligned, bottom anchored */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 pb-16 md:pb-20">

        {/* Status chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/8 backdrop-blur-sm text-white/75 text-xs font-medium mb-7">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
          AI-платформа туризма Камчатки
        </div>

        {/* Headline */}
        <h1
          className="font-playfair font-bold text-white leading-[1.0] mb-5"
          style={{ fontSize: 'clamp(2.8rem, 7vw, 5rem)', textShadow: '0 4px 40px rgba(0,0,0,0.5)' }}
        >
          Камчатка.
          <br />
          <span style={{ color: 'var(--accent)', textShadow: '0 4px 32px rgba(212,74,12,0.45)' }}>
            Умная.
          </span>
        </h1>

        <p
          className="text-white/70 text-base md:text-lg max-w-xl mb-8 leading-relaxed font-light"
          style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}
        >
          Первая платформа с AI-оператором, советом из 10 агентов,
          поисково-спасательным AI и eco-мониторингом.
        </p>

        {/* Capability pills */}
        <div className="flex flex-wrap gap-2 mb-9">
          {PILLS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white/80 border border-white/15"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#chat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 active:scale-95"
            style={{ background: 'var(--accent)' }}
          >
            <Bot className="w-4 h-4" />
            Спросить Кузьмича
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium text-white border border-white/30 hover:bg-white/10 transition-colors"
          >
            Оставить заявку
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-7 right-7 z-10 animate-bounce opacity-50">
        <ChevronDown className="w-5 h-5 text-white" />
      </div>
    </section>
  );
}
