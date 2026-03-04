import React from 'react';

interface BearIconProps {
  className?: string;
}

export const BearIcon: React.FC<BearIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Ears */}
    <circle
      cx="6"
      cy="5"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle
      cx="18"
      cy="5"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Head */}
    <ellipse
      cx="12"
      cy="8"
      rx="5"
      ry="4.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Body */}
    <ellipse
      cx="12"
      cy="16"
      rx="7"
      ry="5.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Front legs */}
    <path
      d="M7 19L6 22"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M17 19L18 22"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Snout */}
    <ellipse
      cx="12"
      cy="9.5"
      rx="2"
      ry="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);
