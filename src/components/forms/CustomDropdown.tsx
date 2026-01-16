import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../../styles/tokens';

interface Option {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  icon,
  placeholder = 'Select option',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < options.length - 1) {
        handleSelect(options[index + 1].value);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        handleSelect(options[index - 1].value);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative flex-shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 pl-10 pr-4 border border-gray-200 rounded-lg bg-white cursor-pointer transition-all duration-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-left flex items-center justify-between gap-3"
        style={{
          fontFamily: designTokens.typography.fontFamily,
          fontSize: designTokens.typography.sizes.sm,
          fontWeight: designTokens.typography.weights.regular,
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-3 flex-1">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {displayText}
          </span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-shrink-0"
        >
          <ChevronDown size={18} className="text-gray-600" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
            style={{
              minWidth: triggerRef.current?.offsetWidth || 'auto',
            }}
          >
            <ul
              className="py-1 max-h-64 overflow-y-auto"
              role="listbox"
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <motion.li
                    key={option.value}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.04 }}
                  >
                    <button
                      onClick={() => handleSelect(option.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className={`w-full text-left px-4 py-3 transition-colors duration-150 ${
                        isSelected
                          ? 'bg-black text-white'
                          : 'text-gray-900 hover:bg-gray-50'
                      }`}
                      style={{
                        fontFamily: designTokens.typography.fontFamily,
                        fontSize: designTokens.typography.sizes.sm,
                        fontWeight: isSelected ? designTokens.typography.weights.medium : designTokens.typography.weights.regular,
                      }}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {option.label}
                    </button>
                  </motion.li>
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
