'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  /** Swaps the switch for a spinner, so the control keeps its footprint. */
  loading?: boolean;
  ariaLabel: string;
}

/**
 * The green publish/active switch used across the admin.
 *
 * Markup and classes are lifted verbatim from AdminBlogCard so that adopting
 * this component anywhere is a visual no-op.
 */
export function ToggleSwitch({ checked, onChange, disabled, loading, ariaLabel }: ToggleSwitchProps) {
  if (loading) {
    return <Loader2 size={16} className="text-gray-400 animate-spin" />;
  }

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
        aria-label={ariaLabel}
      />
      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
    </label>
  );
}
