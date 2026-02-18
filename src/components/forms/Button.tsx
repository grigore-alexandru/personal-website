import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 ' +
    'disabled:bg-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed ' +
    'focus-visible:shadow-token-focus-accent',
  secondary:
    'bg-white text-token-text-primary border-2 border-border-default hover:border-border-strong hover:bg-surface-sunken ' +
    'active:bg-neutral-100 disabled:border-border-default disabled:text-token-text-disabled disabled:cursor-not-allowed ' +
    'focus-visible:shadow-token-focus',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 ' +
    'disabled:bg-red-200 disabled:text-red-400 disabled:cursor-not-allowed ' +
    'focus-visible:shadow-token-focus',
  ghost:
    'bg-transparent text-token-text-primary hover:bg-surface-sunken active:bg-neutral-200 ' +
    'disabled:text-token-text-disabled disabled:cursor-not-allowed ' +
    'focus-visible:shadow-token-focus',
};

export function Button({
  variant = 'primary',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        px-6 py-3 rounded-token-md font-medium
        transition-lift duration-250 ease-smooth
        flex items-center justify-center gap-2
        focus:outline-none
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
