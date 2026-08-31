'use client';

import { useEffect, useState } from 'react';
import { History, Loader2, Sparkles } from 'lucide-react';
import { FormInput } from '../forms/FormInput';
import { FormTextarea } from '../forms/FormTextarea';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { useAutosaveField } from '../../hooks/useAutosaveField';
import { loadDestinationHistory } from '../../utils/linksService';
import {
  DESCRIPTION_MAX_LENGTH,
  validateDescription,
  validateExpiresAt,
  validateMaxClicks,
} from '../../utils/validateLinkForm';
import type { DestinationHistoryEntry, Link, LinkPatch } from '../../types/links';

interface LinkCardExpandedProps {
  link: Link;
  onPatch: (patch: LinkPatch) => Promise<void>;
  onError: (message: string) => void;
  onEditInterstitial: () => void;
  onOpenStats: () => void;
  /** Reports whether any field is currently invalid, so the card can refuse to collapse. */
  onValidityChange: (valid: boolean) => void;
  /** Registers a commit-all function the parent calls before collapsing. */
  registerCommit: (commit: () => Promise<boolean>) => void;
}

/** `expires_at` is a timestamptz; the date input speaks YYYY-MM-DD. */
function toDateInput(value: string | null): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function fromDateInput(value: string): string | null {
  if (!value.trim()) return null;
  // End of the chosen day — an expiry of "the 5th" should include the 5th.
  return new Date(`${value}T23:59:59`).toISOString();
}

export function LinkCardExpanded({
  link,
  onPatch,
  onError,
  onEditInterstitial,
  onOpenStats,
  onValidityChange,
  registerCommit,
}: LinkCardExpandedProps) {
  const [history, setHistory] = useState<DestinationHistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [togglingInterstitial, setTogglingInterstitial] = useState(false);

  const description = useAutosaveField<string>({
    initial: link.description ?? '',
    validate: validateDescription,
    save: async (value) => onPatch({ description: value.trim() || null }),
    onError,
  });

  const expiresAt = useAutosaveField<string>({
    initial: toDateInput(link.expiresAt),
    validate: validateExpiresAt,
    save: async (value) => onPatch({ expiresAt: fromDateInput(value) }),
    onError,
  });

  const maxClicks = useAutosaveField<string>({
    initial: link.maxClicks == null ? '' : String(link.maxClicks),
    validate: validateMaxClicks,
    save: async (value) => onPatch({ maxClicks: value.trim() ? Number(value) : null }),
    onError,
  });

  const invalid = Boolean(description.error || expiresAt.error || maxClicks.error);

  useEffect(() => {
    onValidityChange(!invalid);
  }, [invalid, onValidityChange]);

  useEffect(() => {
    registerCommit(async () => {
      const results = await Promise.all([
        description.commit(),
        expiresAt.commit(),
        maxClicks.commit(),
      ]);
      return results.every(Boolean);
    });
  }, [registerCommit, description.commit, expiresAt.commit, maxClicks.commit]);

  useEffect(() => {
    let cancelled = false;
    loadDestinationHistory(link.id)
      .then((entries) => {
        if (!cancelled) setHistory(entries);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setHistory([]);
          setHistoryError(err instanceof Error ? err.message : 'Could not load history');
        }
      });
    return () => {
      cancelled = true;
    };
    // Reload whenever the destination changes — a change adds a history row.
  }, [link.id, link.destinationUrl]);

  const handleInterstitialToggle = async () => {
    setTogglingInterstitial(true);
    try {
      await onPatch({ interstitialEnabled: !link.interstitialEnabled });
    } finally {
      setTogglingInterstitial(false);
    }
  };

  return (
    <div className="border-t border-neutral-200 px-5 py-5 bg-neutral-50/60 space-y-5">
      <FormTextarea
        label="Description"
        value={description.value}
        onChange={(e) => description.setValue(e.target.value)}
        onBlur={() => void description.commit()}
        error={description.error}
        maxLength={DESCRIPTION_MAX_LENGTH}
        showCharCount
        rows={2}
        placeholder="A short note to yourself about where this link lives."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label="Expires on"
          type="date"
          value={expiresAt.value}
          onChange={(e) => expiresAt.setValue(e.target.value)}
          onBlur={() => void expiresAt.commit()}
          error={expiresAt.error}
          helperText="Leave empty for no expiry"
        />

        <FormInput
          label="Click limit"
          type="number"
          min={1}
          step={1}
          value={maxClicks.value}
          onChange={(e) => maxClicks.setValue(e.target.value)}
          onBlur={() => void maxClicks.commit()}
          error={maxClicks.error}
          helperText="Leave empty for unlimited"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-neutral-200 rounded-lg">
        <div className="flex items-center gap-3">
          <ToggleSwitch
            checked={link.interstitialEnabled}
            onChange={handleInterstitialToggle}
            disabled={togglingInterstitial}
            loading={togglingInterstitial}
            ariaLabel="Toggle interstitial animation"
          />
          <div>
            <p className="text-sm font-medium text-black">Interstitial animation</p>
            <p className="text-xs text-neutral-500">
              {link.interstitialEnabled
                ? `Plays before the redirect · ${link.interstitialFallbackSeconds}s fallback`
                : 'Off — visitors go straight to the destination'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onEditInterstitial}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <Sparkles size={16} />
          Edit animation
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <History size={15} className="text-neutral-400" />
          <h4 className="text-sm font-medium text-black">Destination history</h4>
        </div>

        {history === null ? (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Loader2 size={14} className="animate-spin" />
            Loading…
          </div>
        ) : historyError ? (
          <p className="text-sm text-red-600">{historyError}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-neutral-500">
            The destination hasn&apos;t changed since this link was created.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {history.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                <span className="text-neutral-700 break-all line-through decoration-neutral-300">
                  {entry.oldDestinationUrl}
                </span>
                <span className="text-xs text-neutral-400">
                  until {new Date(entry.changedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenStats}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        View stats for this link →
      </button>
    </div>
  );
}
