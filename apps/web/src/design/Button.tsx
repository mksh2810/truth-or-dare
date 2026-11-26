import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary-dare' | 'primary-truth' | 'secondary' | 'ghost' | 'danger';
export type SurfaceMode = 'linen' | 'lamplit';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  surface?: SurfaceMode;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary-dare',
  surface = 'linen',
  loading = false,
  fullWidth = false,
  disabled = false,
  className = '',
  style,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    'primary-dare': {
      backgroundColor: 'var(--color-dare-terracotta)',
      color: 'var(--color-cream)',
      border: '1px solid rgba(35, 32, 28, 0.16)',
      boxShadow: 'var(--shadow-card)',
    },
    'primary-truth': {
      backgroundColor: 'var(--color-truth-teal)',
      color: 'var(--color-cream)',
      border: '1px solid rgba(35, 32, 28, 0.16)',
      boxShadow: 'var(--shadow-card)',
    },
    secondary:
      surface === 'lamplit'
        ? {
            backgroundColor: 'rgba(255, 253, 249, 0.12)',
            color: 'var(--color-cream)',
            border: 'var(--border-lamplit-hairline)',
          }
        : {
            backgroundColor: 'var(--color-cream)',
            color: 'var(--color-ink)',
            border: 'var(--border-ink-hairline)',
            boxShadow: 'var(--shadow-card)',
          },
    ghost: {
      backgroundColor: 'transparent',
      color: surface === 'lamplit' ? 'var(--color-cream)' : 'var(--color-ink)',
      border: '1px solid transparent',
    },
    danger: {
      backgroundColor: 'var(--color-brick)',
      color: 'var(--color-cream)',
      border: '1px solid rgba(35, 32, 28, 0.18)',
      boxShadow: 'var(--shadow-card)',
    },
  };

  return (
    <button
      type={rest.type ?? 'button'}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      style={{
        borderRadius: 'var(--radius-control)',
        ...variantStyles[variant],
        ...style,
      }}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span>{children}</span>
    </button>
  );
}
