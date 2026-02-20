'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface FormInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'password' | 'url';
  placeholder?: string;
  required?: boolean;
  icon?: LucideIcon;
  hint?: string;
  mask?: (value: string) => string;
  maxLength?: number;
  disabled?: boolean;
}

export function FormInput({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  icon: Icon,
  hint,
  mask,
  maxLength,
  disabled = false,
}: FormInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    if (mask) {
      newValue = mask(newValue);
    }
    onChange(newValue);
  };

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-2 text-white/90 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        required={required}
        maxLength={maxLength}
        disabled={disabled}
        className={clsx(
          'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl',
          'focus:outline-none focus:ring-2 focus:ring-premium-gold/50 focus:border-premium-gold',
          'text-white placeholder-white/40 transition-all',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        placeholder={placeholder}
      />
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  );
}

interface FormTextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  icon?: LucideIcon;
  hint?: string;
  rows?: number;
}

export function FormTextarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  icon: Icon,
  hint,
  rows = 4,
}: FormTextareaProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-2 text-white/90 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        rows={rows}
        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/50 focus:border-premium-gold text-white placeholder-white/40 transition-all resize-none"
        placeholder={placeholder}
      />
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  );
}

interface FormCheckboxProps {
  label: string | React.ReactNode;
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
}

export function FormCheckbox({ label, name, checked, onChange, required = false }: FormCheckboxProps) {
  const checkboxId = name || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  return (
    <label htmlFor={checkboxId} className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5">
        <input
          id={checkboxId}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={required}
          className="sr-only"
        />
        <div
          className={clsx(
            'w-5 h-5 border-2 rounded transition-all',
            checked
              ? 'bg-premium-gold border-premium-gold'
              : 'bg-white/10 border-white/30 group-hover:border-white/50'
          )}
        >
          {checked && (
            <svg className="w-full h-full text-premium-black p-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-sm text-white/80 leading-tight">{label}</span>
    </label>
  );
}
