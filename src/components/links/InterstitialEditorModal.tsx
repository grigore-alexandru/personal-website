'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, ClipboardPaste, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Button } from '../forms/Button';
import { InterstitialPreview, type PreviewValidation } from './InterstitialPreview';
import {
  DEFAULT_FALLBACK_SECONDS,
  FALLBACK_MAX_SECONDS,
  FALLBACK_MIN_SECONDS,
  validateFallbackSeconds,
} from '../../utils/validateLinkForm';
import type { Link, LinkPatch } from '../../types/links';

interface InterstitialEditorModalProps {
  open: boolean;
  link: Link | null;
  onClose: () => void;
  onSave: (id: string, patch: LinkPatch) => Promise<void>;
  onToast: (type: 'success' | 'error', message: string) => void;
}

export function InterstitialEditorModal({
  open,
  link,
  onClose,
  onSave,
  onToast,
}: InterstitialEditorModalProps) {
  const [code, setCode] = useState('');
  const [fallback, setFallback] = useState(String(DEFAULT_FALLBACK_SECONDS));
  const [validation, setValidation] = useState<PreviewValidation | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);

  // Reset to the record every time the modal opens on a link.
  useEffect(() => {
    if (!open || !link) return;
    setCode(link.interstitialCode ?? '');
    setFallback(String(link.interstitialFallbackSeconds));
    setValidation(null);
    setFullscreen(false);
    setConfirmingExit(false);
  }, [open, link]);

  const fallbackError = useMemo(() => {
    const parsed = Number(fallback);
    if (!fallback.trim() || Number.isNaN(parsed)) return 'Enter a number of seconds';
    return validateFallbackSeconds(parsed);
  }, [fallback]);

  const dirty =
    !!link &&
    (code !== (link.interstitialCode ?? '') || fallback !== String(link.interstitialFallbackSeconds));

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        onToast('error', 'Clipboard is empty');
        return;
      }
      setCode(text);
    } catch {
      onToast('error', 'Clipboard access was blocked — paste with ⌘V instead');
    }
  };

  const handleSave = async () => {
    if (!link || fallbackError) return;
    setSaving(true);
    try {
      await onSave(link.id, {
        interstitialCode: code.trim() ? code : null,
        interstitialFallbackSeconds: Number(fallback),
      });
      onToast('success', 'Animation saved');
      onClose();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Could not save the animation');
    } finally {
      setSaving(false);
    }
  };

  /** X and Cancel behave identically: prompt only when there is something to lose. */
  const handleRequestClose = () => {
    if (dirty) setConfirmingExit(true);
    else onClose();
  };

  if (!link) return null;

  const statusStrip = !code.trim() ? (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 border border-neutral-200 text-sm text-neutral-500">
      <AlertCircle size={16} />
      No code yet — paste or type an animation above
    </div>
  ) : validation === null ? (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 border border-neutral-200 text-sm text-neutral-500">
      <Loader2 size={16} className="animate-spin" />
      Checking…
    </div>
  ) : validation.ok ? (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
      <CheckCircle size={16} className="text-green-600" />
      Loads fine
    </div>
  ) : (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
      <span className="break-words">Error: {validation.message ?? 'Unknown error'}</span>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={handleRequestClose}
        closeOnBackdrop={false}
        size="xl"
        title="Edit animation"
        subtitle={`Shown before visitors reach the destination · /r/${link.slug}`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={handleRequestClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!!fallbackError}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="interstitial-code" className="text-sm font-medium text-black">
                Code
              </label>
              <button
                type="button"
                onClick={handlePaste}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <ClipboardPaste size={14} />
                Paste code
              </button>
            </div>

            <textarea
              id="interstitial-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setValidation(null);
              }}
              spellCheck={false}
              placeholder={'<!doctype html>\n<style>/* … */</style>\n<div>…</div>\n<script>\n  // when the animation is done:\n  parent.postMessage("interstitial:ready", "*");\n<\/script>'}
              className="w-full h-72 px-3 py-2.5 border border-neutral-300 rounded-lg font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-y"
            />

            {statusStrip}

            <div>
              <label htmlFor="fallback-seconds" className="block text-sm font-medium text-black mb-2">
                Fallback timeout
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="fallback-seconds"
                  type="number"
                  min={FALLBACK_MIN_SECONDS}
                  max={FALLBACK_MAX_SECONDS}
                  value={fallback}
                  onChange={(e) => setFallback(e.target.value)}
                  className={`w-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                    fallbackError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-neutral-300 focus:ring-black focus:border-transparent'
                  }`}
                />
                <span className="text-sm text-neutral-500">seconds</span>
              </div>
              {fallbackError ? (
                <p className="mt-2 text-sm text-red-600">{fallbackError}</p>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">
                  Visitors are forwarded after this long even if the animation never signals.
                </p>
              )}
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed border-t border-neutral-200 pt-3">
              The animation runs in a sandbox and never learns the destination. When it&apos;s
              finished, hand control back with{' '}
              <code className="px-1 py-0.5 bg-neutral-100 rounded font-mono">
                parent.postMessage(&quot;interstitial:ready&quot;, &quot;*&quot;)
              </code>
              .
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-black">Preview</span>
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                aria-label="Expand preview"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            <div className="h-72 lg:h-[26rem] rounded-lg border border-neutral-300 overflow-hidden bg-neutral-50">
              {code.trim() ? (
                <InterstitialPreview code={code} onValidation={setValidation} />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-neutral-400">
                  Nothing to preview yet
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {fullscreen && (
        <div className="fixed inset-0 z-[60] bg-black">
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Exit fullscreen preview"
            className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/90 text-black hover:bg-white transition-colors"
          >
            <Minimize2 size={18} />
          </button>
          <InterstitialPreview code={code} />
        </div>
      )}

      <ConfirmDialog
        open={confirmingExit}
        variant="primary"
        title="Save your changes?"
        message="You've edited this animation without saving."
        note="Discard to close and keep the previously saved version."
        cancelLabel="Keep editing"
        discardLabel="Discard"
        confirmLabel="Save changes"
        loading={saving}
        onCancel={() => setConfirmingExit(false)}
        onDiscard={() => {
          setConfirmingExit(false);
          onClose();
        }}
        onConfirm={async () => {
          setConfirmingExit(false);
          await handleSave();
        }}
      />
    </>
  );
}
