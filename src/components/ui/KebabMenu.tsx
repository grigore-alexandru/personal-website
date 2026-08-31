'use client';

import React, { ReactNode, useState } from 'react';
import { MoreVertical } from 'lucide-react';

export type KebabSize = 'sm' | 'md';

export interface KebabMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  /** 'danger' renders red — reserved for destructive actions. */
  variant?: 'default' | 'danger';
  hidden?: boolean;
}

interface KebabMenuProps {
  items: KebabMenuItem[];
  ariaLabel?: string;
  /** 'md' is the blog/portfolio menu; 'sm' the tighter content-card one. */
  size?: KebabSize;
  /** Override the dropdown width (defaults: md → w-40, sm → w-32). */
  width?: string;
  /** Stop the click reaching a card link underneath. */
  stopPropagation?: boolean;
}

// Values taken from the three cards as they stand today.
const iconSize: Record<KebabSize, number> = { md: 16, sm: 14 };
const triggerClasses: Record<KebabSize, string> = {
  md: 'p-1 rounded hover:bg-gray-50 transition-colors',
  sm: 'p-1 rounded hover:bg-gray-100 transition-colors',
};
const defaultWidth: Record<KebabSize, string> = { md: 'w-40', sm: 'w-32' };
const itemPadding: Record<KebabSize, string> = { md: 'px-4 py-2', sm: 'px-3 py-2' };

/**
 * The "⋮" overflow menu used on every admin card.
 *
 * The click-outside layer is a fixed inset-0 backdrop rather than a document
 * listener: that is what makes one outside click close the menu without also
 * activating whatever sits underneath it.
 */
export function KebabMenu({
  items,
  ariaLabel = 'More options',
  size = 'md',
  width,
  stopPropagation = true,
}: KebabMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleItems = items.filter((item) => !item.hidden);

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleItemClick = (e: React.MouseEvent, item: KebabMenuItem) => {
    if (stopPropagation) e.stopPropagation();
    setMenuOpen(false);
    item.onClick();
  };

  return (
    <>
      <button
        onClick={handleTriggerClick}
        className={triggerClasses[size]}
        aria-label={ariaLabel}
        aria-expanded={menuOpen}
      >
        <MoreVertical size={iconSize[size]} className="text-gray-600" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
          <div
            className={`absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 ${
              width ?? defaultWidth[size]
            } z-30`}
            role="menu"
          >
            {visibleItems.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={(e) => handleItemClick(e, item)}
                className={`w-full ${itemPadding[size]} text-left text-sm flex items-center gap-2 ${
                  item.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
