import React from 'react';

interface RiverIconProps {
  className?: string;
}

export const RiverIcon: React.FC<RiverIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Mountain source */}
    <path d="M3 7L7 3L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* River top wave */}
    <path
      d="M2 11Q5 9 8 11Q11 13 14 11Q17 9 22 11"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    />
    {/* River middle wave */}
    <path
      d="M2 15Q5 13 8 15Q11 17 14 15Q17 13 22 15"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    />
    {/* River bottom wave */}
    <path
      d="M2 19Q5 17 8 19Q11 21 14 19Q17 17 22 19"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    />
  </svg>
);
