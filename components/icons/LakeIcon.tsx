import React from 'react';

interface LakeIconProps {
  className?: string;
}

export const LakeIcon: React.FC<LakeIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Mountain */}
    <path d="M4 14L9 7L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Far mountain */}
    <path d="M11 14L15 9L19 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Lake surface */}
    <ellipse cx="12" cy="18" rx="8" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
    {/* Reflection ripple */}
    <path d="M8 20.5Q10 21.5 12 20.5Q14 19.5 16 20.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);
