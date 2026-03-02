import React from 'react';

interface JeepIconProps {
  className?: string;
}

export const JeepIcon: React.FC<JeepIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Body outline */}
    <path
      d="M2 16L2 11L5 7L15 7L18 10L21 10L22 16L2 16Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Windshield */}
    <path
      d="M5 7L6 10L14 10L15 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Front wheel */}
    <circle
      cx="17"
      cy="17"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Rear wheel */}
    <circle
      cx="7"
      cy="17"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Door line */}
    <path
      d="M10 7L10 16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);