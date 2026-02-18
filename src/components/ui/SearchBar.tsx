import { useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  size = 'md',
  className = '',
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = size === 'sm'
    ? 'h-9 pl-9 pr-8 text-xs'
    : 'h-11 pl-10 pr-9 text-sm';

  const iconSize = size === 'sm' ? 15 : 17;
  const iconLeft = size === 'sm' ? 'left-2.5' : 'left-3';
  const clearRight = size === 'sm' ? 'right-2' : 'right-2.5';

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={iconSize}
        className={`absolute ${iconLeft} pointer-events-none text-neutral-400 transition-colors duration-150`}
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`
          w-full ${sizeClasses} rounded-lg border border-neutral-200 bg-white
          font-[Poppins,sans-serif] text-neutral-900 placeholder:text-neutral-400
          transition-all duration-150
          hover:border-neutral-400 hover:shadow-[0_1px_3px_0_rgba(0,0,0,0.08)]
          focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]
        `}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className={`absolute ${clearRight} flex items-center justify-center w-5 h-5 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors duration-150`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
