'use client';

import React, { ReactNode, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

export interface SplitButtonItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

interface SplitButtonProps {
  /** The primary action's label — also the default of the dropdown list. */
  label: string;
  onClick: () => void;
  items: SplitButtonItem[];
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  /** 'up' opens the list above the button — for buttons near a container's
   *  bottom edge, where a downward list would be clipped by a scroll area. */
  direction?: 'down' | 'up';
}

/**
 * A primary action with a chevron that opens the alternatives beside it.
 *
 * Used for export, where one action is the obvious default (Download PNG) and
 * the rest are variations on it. The dropdown reuses KebabMenu's positioning
 * and backdrop pattern so the two read as the same family.
 */
export function SplitButton({
  label,
  onClick,
  items,
  icon,
  loading,
  disabled,
  direction = 'down',
}: SplitButtonProps) {
  const [open, setOpen] = useState(false);

  const handleItemClick = (e: React.MouseEvent, item: SplitButtonItem) => {
    e.stopPropagation();
    setOpen(false);
    item.onClick();
  };

  return (
    <div className="relative inline-flex">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-l-lg hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
        {label}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={disabled || loading}
        aria-label="More export options"
        aria-expanded={open}
        className="flex items-center px-2 bg-black text-white rounded-r-lg border-l border-gray-700 hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        <ChevronDown size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            className={`absolute right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 z-30 ${
              direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
            role="menu"
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={(e) => handleItemClick(e, item)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
