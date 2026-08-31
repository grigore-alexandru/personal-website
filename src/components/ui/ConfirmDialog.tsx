'use client';

import { Loader2 } from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Optional smaller line under the message, for consequences worth spelling out. */
  note?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Two-button confirmation dialog.
 *
 * Panel markup is lifted verbatim from the hand-rolled delete and publish
 * dialogs in admin/blog, so replacing those with this component changes
 * nothing on screen. Deliberately has no X button: it already offers an
 * explicit Cancel, and adding a third way out would make it differ from the
 * dialogs it replaces.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  note,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loadingLabel,
  variant = 'danger',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useModalBehavior(open, onCancel);

  if (!open) return null;

  const confirmClasses =
    variant === 'danger'
      ? 'flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2'
      : 'flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-black mb-2">{title}</h3>
        <p className={note ? 'text-gray-600 mb-4' : 'text-gray-600 mb-6'}>{message}</p>
        {note && <p className="text-sm text-gray-500 mb-6">{note}</p>}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading} className={confirmClasses}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading && loadingLabel ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
