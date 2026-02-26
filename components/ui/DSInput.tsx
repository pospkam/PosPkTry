import { forwardRef, type InputHTMLAttributes } from 'react';

interface DSInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/**
 * DSInput -- поле ввода дизайн-системы.
 * Touch target: min-h-[44px].
 * Фокус: border + ring цвета accent.
 */
export const DSInput = forwardRef<HTMLInputElement, DSInputProps>(
  function DSInput({ label, id, className = '', ...rest }, ref) {
    const inputId = id ?? (label ? `ds-input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm text-[var(--text-secondary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full min-h-[44px] px-4
            bg-[var(--bg-card)] border border-[var(--border)]
            rounded-[var(--radius-md)]
            text-[var(--text-primary)]
            placeholder:text-[var(--text-muted)]
            focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]
            focus:outline-none
            transition-colors duration-200
            ${className}
          `}
          {...rest}
        />
      </div>
    );
  }
);
