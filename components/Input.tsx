import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-textMuted mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`
            w-full bg-surface border border-border text-textMain rounded-lg px-4 py-3 
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            placeholder-textMuted/50 transition-all duration-200
            ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
            ${icon ? 'pl-11' : ''}
            ${className}
          `}
          {...props}
        />
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};