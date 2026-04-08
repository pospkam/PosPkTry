'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { FISH_SPECIES, type FishSpecies } from '@/lib/fish-species';

interface TextChunk {
  text: string;
  species?: FishSpecies;
}

function parseTextChunks(text: string): TextChunk[] {
  const matches: { start: number; end: number; matched: string; species: FishSpecies }[] = [];

  for (const species of FISH_SPECIES) {
    for (const pattern of species.patterns) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const start = m.index;
        const end = m.index + m[0].length;
        if (!matches.some(e => e.start < end && e.end > start)) {
          matches.push({ start, end, matched: m[0], species });
        }
      }
    }
  }

  if (matches.length === 0) return [{ text }];

  matches.sort((a, b) => a.start - b.start);

  const chunks: TextChunk[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) chunks.push({ text: text.slice(cursor, m.start) });
    chunks.push({ text: m.matched, species: m.species });
    cursor = m.end;
  }
  if (cursor < text.length) chunks.push({ text: text.slice(cursor) });

  return chunks;
}

function ParagraphWithLinks({ text }: { text: string }) {
  const chunks = useMemo(() => parseTextChunks(text), [text]);
  const hasFish = chunks.some(c => c.species);

  if (!hasFish) return <p>{text}</p>;

  return (
    <p>
      {chunks.map((chunk, i) =>
        chunk.species ? (
          <Link
            key={i}
            href={`/fish/${chunk.species.id}`}
            className="font-medium underline decoration-dotted underline-offset-2 transition-colors hover:no-underline"
            style={{ color: chunk.species.color, textDecorationColor: `${chunk.species.color}70` }}
            title={`${chunk.species.name} — ${chunk.species.nameLatin}`}
          >
            {chunk.text}
          </Link>
        ) : (
          <span key={i}>{chunk.text}</span>
        )
      )}
    </p>
  );
}

interface Props {
  paragraphs: string[];
  className?: string;
  style?: React.CSSProperties;
}

export default function DescriptionWithFishLinks({ paragraphs, className, style }: Props) {
  return (
    <div className={className} style={style}>
      {paragraphs.map((p, i) => (
        <ParagraphWithLinks key={i} text={p} />
      ))}
    </div>
  );
}

