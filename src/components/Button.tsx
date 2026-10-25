import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  size = 'lg',
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-mono font-bold uppercase transition-transform active:translate-x-[3px] active:translate-y-[3px] focus:outline-none select-none disabled:opacity-50 disabled:pointer-events-none';

  const sizeClasses = {
    sm: 'h-10 px-4 text-xs rounded-btn border-2 border-ink shadow-hard-sm active:shadow-[1px_1px_0px_#1C1917]',
    md: 'h-12 px-6 text-sm rounded-btn border-2 border-ink shadow-hard active:shadow-hard-pressed',
    lg: 'h-14 px-8 text-sm md:text-base rounded-btn border-2 border-ink shadow-hard active:shadow-hard-pressed tracking-wider',
  }[size];

  const variantClasses = {
    primary: 'bg-dare text-white hover:brightness-105',
    secondary: 'bg-peach text-ink hover:brightness-95',
    quiet: 'bg-transparent text-ink border-transparent shadow-none hover:bg-black/5 active:translate-x-0 active:translate-y-0 active:shadow-none',
    danger: 'bg-fail text-white hover:brightness-105',
  }[variant];

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
