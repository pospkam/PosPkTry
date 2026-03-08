import React from 'react';

interface SeaWalkIconProps {
  className?: string;
}

export const SeaWalkIcon: React.FC<SeaWalkIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Boat hull */}
    <path
      d="M3 14L5 18Q8 20 12 20Q16 20 19 18L21 14Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Deck line */}
    <path d="M3 14L21 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Mast */}
    <path d="M12 14L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Sail */}
    <path
      d="M12 6L18 12L12 12Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Waves */}
    <path d="M2 22Q5 21 8 22Q11 23 14 22Q17 21 22 22" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);
