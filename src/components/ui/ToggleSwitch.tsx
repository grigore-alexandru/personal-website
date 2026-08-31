'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ToggleSize = 'sm' | 'md';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  /** Swaps the switch for a spinner, keeping the control's footprint. */
  loading?: boolean;
  ariaLabel?: string;
  /** 'md' is the blog/portfolio card switch; 'sm' the tighter content-card one. */
  size?: ToggleSize;
  /** Content and portfolio cards stop the click reaching the card link beneath. */
  onInputClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
}

// Lifted verbatim from AdminBlogCard ('md') and AdminContentCard ('sm'). The two
// differ by more than dimensions — 'sm' also drops the rtl: and
// peer-checked:after:border-white rules — so they are kept as whole strings
// rather than composed, to guarantee neither card shifts by a pixel.
const trackClasses: Record<ToggleSize, string> = {
  md: "w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600",
  sm: "w-8 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-600",
};

const spinnerSize: Record<ToggleSize, number> = { md: 16, sm: 14 };

/** The green active/published switch used across the admin. */
export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  loading,
  ariaLabel,
  size = 'md',
  onInputClick,
}: ToggleSwitchProps) {
  if (loading) {
    return <Loader2 size={spinnerSize[size]} className="text-gray-400 animate-spin" />;
  }

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        onClick={onInputClick}
        className="sr-only peer"
        aria-label={ariaLabel}
      />
      <div className={trackClasses[size]} />
    </label>
  );
}
