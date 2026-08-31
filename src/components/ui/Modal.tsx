'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';

type ModalSize = 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: ModalSize;
  children: ReactNode;
  /** Sticky action bar pinned to the bottom of the panel. */
  footer?: ReactNode;
  /** Set false when closing needs a confirmation step of its own. */
  closeOnBackdrop?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  md:   'max-w-md',
  lg:   'max-w-2xl',
  xl:   'max-w-6xl',
  full: 'max-w-[95vw] h-[92vh]',
};

/**
 * The shared modal shell for the admin panel.
 *
 * One consistent convention across every modal that uses it: the close button
 * is an X in the panel's top-right corner, Escape closes, the backdrop closes
 * (unless the host opts out because it needs to confirm first), and the page
 * behind stops scrolling.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
  footer,
  closeOnBackdrop = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useModalBehavior(open, onClose);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative bg-white rounded-xl w-full ${sizeClasses[size]} max-h-[92vh] flex flex-col outline-none shadow-xl`}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {(title || subtitle) && (
          <div className="px-6 pt-6 pb-4 pr-16 flex-shrink-0">
            {title && <h3 className="text-xl font-bold text-black">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>

        {footer && (
          <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 bg-white rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
