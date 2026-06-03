'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Fact {
  num: string;
  text: string;
  href?: string;
}

const FACTS: Fact[] = [
  { num: '6',   text: 'туристов погибло на Ключевском — 2022', href: '/safety/incidents' },
  { num: '154', text: 'маршрута требуют регистрации в МЧС',     href: '/routes?kind=route' },
  { num: '763', text: 'точки с профилем безопасности',          href: '/routes?kind=place' },
];

export function EditorialSection() {
  return (
    <section className="py-24 md:py-32 bg-[var(--bg-card)] overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Text Content */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="w-12 h-1 bg-[var(--accent)] mb-10" />
            <h2 className="font-playfair text-5xl md:text-7xl font-bold mb-10 leading-[1.1] text-[var(--text-primary)]">
              Штурман, а не <br /> 
              <span className="italic text-[var(--accent)]">тур-агент</span>
            </h2>
            
            <div className="space-y-8 text-lg md:text-xl text-[var(--text-secondary)] font-light leading-relaxed max-w-2xl">
              <p>
                Ведар — это не очередной каталог отелей. Это ваш цифровой проводник, созданный теми, кто знает каждый распадок и каждую фумаролу Мутновского вулкана.
              </p>
              <p>
                Мы верим в честный туризм. Наша задача — дать вам объективные данные: от реальной сложности маршрута до актуальной активности медведей на Курильском озере.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-[var(--border)] pt-12">
              {FACTS.map((f, i) => (
                <div key={i}>
                  <p className={`text-4xl font-playfair font-bold mb-2 ${i === 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                    {f.num}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold leading-relaxed">
                    {f.text}
                  </p>
                  {f.href && (
                    <Link href={f.href} className="text-[10px] text-[var(--accent)] font-bold uppercase tracking-widest mt-2 inline-block hover:underline">
                      Подробнее →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Visual Content */}
          <div className="lg:col-span-5 order-1 lg:order-2 relative hidden md:block">
            <div className="relative z-10 rounded-lg overflow-hidden shadow-2xl bg-[var(--bg-primary)] aspect-[4/5]">
              <Image 
                src="/images/hero/IMG_20260316_133026.jpg" 
                alt="Kamchatka Editorial" 
                fill
                className="object-cover opacity-80"
              />
              <div className="absolute inset-0 ring-1 ring-[var(--border)] ring-inset" />
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-[var(--bg-card)]/80 border border-[var(--border)]">
                <p className="text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest mb-1">Location</p>
                <p className="text-[var(--text-primary)] font-playfair italic text-lg">Mutnovsky Volcano, South Kamchatka</p>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-[var(--accent)]/10 blur-3xl -z-10 rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[var(--ocean)]/10 blur-3xl -z-10 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
