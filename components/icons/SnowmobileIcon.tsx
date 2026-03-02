import React from 'react';

interface SnowmobileIconProps {
  className?: string;
}

export const SnowmobileIcon: React.FC<SnowmobileIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Body */}
    <path
      d="M4 14L7 9L14 9L17 12L20 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Windshield */}
    <path
      d="M7 9L8 6L12 6L14 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Ski */}
    <path
      d="M2 17L19 17L21 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Rear strut */}
    <path
      d="M5 14L4 17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Front strut */}
    <path
      d="M17 12L18 17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);