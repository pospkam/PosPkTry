import React from 'react';

interface MountainIconProps {
  className?: string;
}

export const MountainIcon: React.FC<MountainIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Back mountain (larger) */}
    <path
      d="M2 20L9 6L16 20"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Front mountain */}
    <path
      d="M10 20L16 10L22 20"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Snow cap on back mountain */}
    <path
      d="M9 6L7 11L11 11Z"
      stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Ground line */}
    <path d="M2 20L22 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Sun */}
    <circle cx="19" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
