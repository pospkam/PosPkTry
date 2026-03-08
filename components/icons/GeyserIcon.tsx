import React from 'react';

interface GeyserIconProps {
  className?: string;
}

export const GeyserIcon: React.FC<GeyserIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ground / rock base */}
    <path
      d="M5 20Q8 18 12 19Q16 20 19 18L19 20Q16 22 12 21Q8 22 5 20Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Main jet */}
    <path d="M12 19L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Jet top bloom */}
    <path d="M12 8Q10 5 9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 8Q12 4 12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 8Q14 5 15 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Droplets */}
    <circle cx="9" cy="4" r="0.7" fill="currentColor" />
    <circle cx="15" cy="4" r="0.7" fill="currentColor" />
    <circle cx="12" cy="3" r="0.7" fill="currentColor" />
  </svg>
);
