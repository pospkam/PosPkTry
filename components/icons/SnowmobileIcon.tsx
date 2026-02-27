import React from 'react';

interface SnowmobileIconProps {
  className?: string;
}

export const SnowmobileIcon: React.FC<SnowmobileIconProps> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4 18L20 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M4 18L6 14L10 14L12 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="18" r="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="8" cy="18" r="2" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 10L16 14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 6L12 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);