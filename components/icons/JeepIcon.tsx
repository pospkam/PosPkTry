import React from 'react';

interface JeepIconProps {
  className?: string;
}

export const JeepIcon: React.FC<JeepIconProps> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="2"
      y="8"
      width="20"
      height="8"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="6" cy="16" r="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="18" cy="16" r="2" stroke="currentColor" strokeWidth="2" />
    <path
      d="M2 12H22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8 8V6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16 8V6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);