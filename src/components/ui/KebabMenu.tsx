'use client';

import React, { ReactNode, useState } from 'react';
import { MoreVertical } from 'lucide-react';

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
  /** Menu width; the blog card's original was w-40. */
  width?: string;
}

/**
 * The "⋮" overflow menu used on every admin card.
 *
 * Markup, classes and the click-outside backdrop are lifted verbatim from
 * AdminBlogCard. The backdrop is a fixed inset-0 layer rather than a document
 * listener, which is what makes a single outside click close the menu without
 * also activating whatever was underneath.
 */
export function KebabMenu({ items, ariaLabel = 'More options', width = 'w-40' }: KebabMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleItems = items.filter((item) => !item.hidden);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleItemClick = (e: React.MouseEvent, item: KebabMenuItem) => {
    e.stopPropagation();
    setMenuOpen(false);
    item.onClick();
  };

  return (
    <>
      <button
        onClick={handleMenuClick}
        className="p-1 rounded hover:bg-gray-50 transition-colors"
        aria-label={ariaLabel}
        aria-expanded={menuOpen}
      >
        <MoreVertical size={16} className="text-gray-600" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
          <div
            className={`absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 ${width} z-30`}
            role="menu"
          >
            {visibleItems.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={(e) => handleItemClick(e, item)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
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
