import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  // Verifica se className já define largura (w-auto, w-full, w-*, etc)
  const hasWidthClass = /\bw-(auto|full|\d+|\[)/.test(className);
  const widthClass = hasWidthClass ? '' : 'w-full';
  
  const baseStyles = `${widthClass} py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`;
  
  const variants = {
    primary: "bg-primary hover:bg-primaryHover text-white shadow-[0_0_15px_rgba(139,44,245,0.3)]",
    secondary: "bg-surfaceHighlight hover:bg-[#323236] text-textMain border border-border",
    ghost: "bg-transparent hover:bg-surfaceHighlight text-textMuted hover:text-textMain"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};