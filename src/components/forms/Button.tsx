import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'accent-pink' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  'aria-label'?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-display text-white shadow-lg ' +
    'hover:bg-accent hover:shadow-xl ' +
    'active:scale-[0.97] ' +
    'disabled:bg-neutral-300 disabled:text-neutral-400 disabled:shadow-none disabled:cursor-not-allowed ' +
    'focus-visible:ring-2 focus-visible:ring-display focus-visible:ring-offset-2',
  secondary:
    'bg-transparent text-display border-2 border-display ' +
    'hover:bg-display hover:text-white hover:shadow-lg ' +
    'active:scale-[0.97] ' +
    'disabled:border-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed ' +
    'focus-visible:ring-2 focus-visible:ring-display focus-visible:ring-offset-2',
  accent:
    'bg-accent text-white shadow-lg ' +
    'hover:bg-accent/90 hover:shadow-xl ' +
    'active:scale-[0.97] ' +
    'disabled:bg-neutral-300 disabled:text-neutral-400 disabled:shadow-none disabled:cursor-not-allowed ' +
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
  'accent-pink':
    'bg-accent-pink text-white shadow-lg ' +
    'hover:bg-accent-pink/90 hover:shadow-xl ' +
    'active:scale-[0.97] ' +
    'disabled:bg-neutral-300 disabled:text-neutral-400 disabled:shadow-none disabled:cursor-not-allowed ' +
    'focus-visible:ring-2 focus-visible:ring-accent-pink focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-display ' +
    'hover:bg-surface-highlight hover:shadow-md ' +
    'active:scale-[0.97] ' +
    'disabled:text-neutral-400 disabled:cursor-not-allowed ' +
    'focus-visible:ring-2 focus-visible:ring-display focus-visible:ring-offset-2',
  danger:
    'bg-red-600 text-white shadow-lg ' +
    'hover:bg-red-700 hover:shadow-xl ' +
    'active:scale-[0.97] ' +
    'disabled:bg-red-200 disabled:text-red-400 disabled:shadow-none disabled:cursor-not-allowed ' +
    'focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-5 py-2.5 text-sm font-bold gap-1.5',
  md: 'px-7 py-3.5 text-base font-bold gap-2',
  lg: 'px-10 py-5 text-lg font-bold gap-3',
  xl: 'px-14 py-6 text-xl font-extrabold gap-4',
};

const spinnerSizes: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'right',
  fullWidth = false,
  children,
  disabled,
  className = '',
  'aria-label': ariaLabel,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      aria-label={ariaLabel ?? (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      className={[
        'inline-flex items-center justify-center rounded-full',
        'transition-all duration-300',
        'hover:scale-[1.03]',
        'focus:outline-none',
        sizeStyles[size],
        variantStyles[variant],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'pointer-events-none' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? (
        <>
          <div
            className={`${spinnerSizes[size]} border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0`}
          />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}
