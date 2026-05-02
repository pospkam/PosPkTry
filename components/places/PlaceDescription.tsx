'use client';

import { useState } from 'react';

interface Props {
  name: string;
  essence: string | null;
  description: string | null;
  placeId: string;
}

export default function PlaceDescription({ name, essence, description, placeId }: Props) {
  const [expanded, setExpanded] = useState(false);

  const essenceText = essence ?? (() => {
    if (!description) return null;
    // Fall back to first 2 sentences
    const sentences = description.match(/[^.!?]+[.!?]+/g) ?? [];
    const fallback = sentences.slice(0, 2).join(' ').trim();
    if (!fallback) return null;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PlaceDescription] essence missing for place_id=${placeId}`);
    }
    return fallback;
  })();

  const paragraphs = description?.split('\n').filter(p => p.trim()) ?? [];
  const isLong = paragraphs.length > 3 || (description?.length ?? 0) > 600;

  return (
    <section className="max-w-3xl mx-auto px-4 pt-8 space-y-4">
      {/* H1 */}
      <h1
        className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight"
        style={{ fontFamily: 'var(--font-playfair)' }}
      >
        {name}
      </h1>

      {/* Essence */}
      {essenceText && (
        <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-medium">
          {essenceText}
        </p>
      )}

      {/* Description */}
      {paragraphs.length > 0 && (
        <div className="space-y-3">
          <div
            className={`overflow-hidden transition-all duration-300 ${isLong && !expanded ? 'max-h-48' : 'max-h-[9999px]'}`}
            style={isLong && !expanded ? { maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' } : undefined}
          >
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-[var(--text-secondary)] leading-relaxed"
                style={{ fontSize: '17px', lineHeight: '1.7', maxWidth: '68ch' }}
              >
                {p}
              </p>
            ))}
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-sm text-[var(--ocean)] hover:text-[var(--accent)] font-medium transition-colors"
            >
              {expanded ? 'Свернуть' : 'Читать полностью'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
