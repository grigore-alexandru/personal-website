import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../../styles/tokens';

export interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  /**
   * Extra Tailwind classes applied to the outermost wrapper.
   * Use this to control width, e.g. `sm:w-48` or `w-full`.
   */
  className?: string;
  /** Accessible label for screen readers when no visible label is present. */
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * CustomDropdown
 *
 * Design system: Tailwind CSS + Framer Motion
 * Primary brand colour: #3b82f6 (designTokens.colors.primary[500])
 *
 * Breakpoint widths (applied via `className` prop by callers):
 *   Mobile  – full-width (default, no width class)
 *   Tablet  – sm:w-52   (208 px)
 *   Desktop – lg:w-64   (256 px)
 *
 * The trigger height is always 44 px (py-2.5 + border) so every instance
 * aligns with adjacent inputs regardless of label length.
 */
const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  icon,
  placeholder = 'Select option',
  className = '',
  ariaLabel,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef   = useRef<HTMLButtonElement>(null);
  const listboxId    = useId();

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText    = selectedOption?.label ?? placeholder;
  const isDefault      = !selectedOption;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = index + 1;
      if (next < options.length) handleSelect(options[next].value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = index - 1;
      if (prev >= 0) handleSelect(options[prev].value);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(options[index].value);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex-shrink-0 ${className}`}
    >
      {/* ── Trigger button ── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        className={[
          'w-full h-11 px-3 flex items-center gap-2',
          'rounded-lg border bg-white',
          'transition-all duration-200',
          'focus:outline-none',
          disabled
            ? 'opacity-50 cursor-not-allowed border-neutral-200'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-sm cursor-pointer'
            : 'border-neutral-200 hover:border-neutral-300 cursor-pointer',
        ].join(' ')}
        style={{
          fontFamily: designTokens.typography.fontFamily,
          fontSize:   '14px',
          fontWeight: designTokens.typography.weights.regular,
        }}
      >
        {/* Left icon */}
        {icon && (
          <span
            className={`flex-shrink-0 transition-colors duration-200 ${
              isOpen ? 'text-blue-500' : 'text-neutral-400'
            }`}
          >
            {icon}
          </span>
        )}

        {/* Label — truncated with ellipsis when too wide */}
        <span
          className={`flex-1 min-w-0 truncate text-left ${
            isDefault ? 'text-neutral-400' : 'text-neutral-900'
          }`}
        >
          {displayText}
        </span>

        {/* Chevron */}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className={`flex-shrink-0 transition-colors duration-200 ${
            isOpen ? 'text-blue-500' : 'text-neutral-400'
          }`}
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden"
            style={{ minWidth: triggerRef.current?.offsetWidth ?? 'auto' }}
          >
            <ul
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel ?? placeholder}
              className="py-1 max-h-60 overflow-y-auto"
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value} role="presentation">
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      onKeyDown={(e) => handleOptionKeyDown(e, index)}
                      role="option"
                      aria-selected={isSelected}
                      className={[
                        'w-full text-left px-3 py-2.5 truncate',
                        'transition-colors duration-150',
                        isSelected
                          ? 'bg-blue-500 text-white font-medium'
                          : 'text-neutral-800 hover:bg-neutral-50',
                      ].join(' ')}
                      style={{
                        fontFamily: designTokens.typography.fontFamily,
                        fontSize:   '14px',
                        fontWeight: isSelected
                          ? designTokens.typography.weights.medium
                          : designTokens.typography.weights.regular,
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomDropdown;
