import React from 'react';
import { cn } from '@/utils/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-[14px] font-bold tracking-[0.04em] uppercase text-[#141413] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#CF4500]" />
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-[12px] border border-[#141413]/10 bg-white px-4 py-2 text-base transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#141413] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="text-xs text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
