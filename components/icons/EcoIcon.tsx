import React from 'react';

interface EcoIconProps {
  className?: string;
}

export const EcoIcon: React.FC<EcoIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Leaf shape */}
    <path
      d="M12 3C12 3 4 7 4 14C4 18 7.5 21 12 21C16.5 21 20 18 20 14C20 7 12 3 12 3Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Center vein */}
    <path d="M12 3L12 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Left veins */}
    <path d="M12 9L8 13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M12 13L8 17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    {/* Right veins */}
    <path d="M12 9L16 13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M12 13L16 17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);
