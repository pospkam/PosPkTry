import React from 'react';

interface VolcanoIconProps {
  className?: string;
}

export const VolcanoIcon: React.FC<VolcanoIconProps> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2L3 22H21L12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="8" r="2" fill="currentColor" />
  </svg>
);