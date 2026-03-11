'use client';

import React from 'react';

const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

const TEXT = '29 вулканов ◆ 400+ ледников ◆ Медведи · Косатки ◆ Долина Гейзеров ◆ UNESCO ◆ ';

export function Marquee() {
  const doubled = TEXT + TEXT;

  return (
    <div
      style={{
        overflow: 'hidden',
        borderBottom: '1px solid var(--kh-border)',
        padding: '10px 0',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          animation: 'kh-marquee 26s linear infinite',
          fontFamily: FO,
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: 'var(--kh-text-dim)',
        }}
      >
        {doubled.split('◆').map((segment, i) => (
          <React.Fragment key={i}>
            <span>{segment}</span>
            {i < doubled.split('◆').length - 1 && (
              <span style={{ color: 'var(--kh-accent)', fontSize: '7px', margin: '0 2px' }}>◆</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
