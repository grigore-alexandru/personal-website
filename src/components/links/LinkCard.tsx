'use client';

import { useCallback, useRef, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, QrCode, Trash2 } from 'lucide-react';
import { KebabMenu } from '../ui/KebabMenu';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { ShortLinkDisplay } from './ShortLinkDisplay';
import { LinkCardExpanded } from './LinkCardExpanded';
import { useAutosaveField } from '../../hooks/useAutosaveField';
import { validateDestinationUrl } from '../../utils/validateLinkForm';
import type { Link, LinkPatch } from '../../types/links';

interface LinkCardProps {
  link: Link;
  expanded: boolean;
  onToggleExpand: () => void;
  onPatch: (id: string, patch: LinkPatch) => Promise<void>;
  onDelete: () => void;
  onOpenStats: () => void;
  onOpenQr: () => void;
  onEditInterstitial: () => void;
  onToast: (type: 'success' | 'error', message: string) => void;
}

/** Why a link is paused, when the reason is knowable from the row itself. */
function pauseReason(link: Link): string | null {
  if (link.status !== 'paused') return null;
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) return 'Expired';
  if (link.maxClicks != null && link.clickCount >= link.maxClicks) return 'Click limit reached';
  return null;
}

export function LinkCard({
  link,
  expanded,
  onToggleExpand,
  onPatch,
  onDelete,
  onOpenStats,
  onOpenQr,
  onEditInterstitial,
  onToast,
}: LinkCardProps) {
  const [toggling, setToggling] = useState(false);
  const [expandedValid, setExpandedValid] = useState(true);
  const commitExpandedRef = useRef<(() => Promise<boolean>) | null>(null);

  const onError = useCallback((message: string) => onToast('error', message), [onToast]);

  const destination = useAutosaveField<string>({
    initial: link.destinationUrl,
    validate: validateDestinationUrl,
    save: async (value) => onPatch(link.id, { destinationUrl: value.trim() }),
    onError,
  });

  const registerCommit = useCallback((commit: () => Promise<boolean>) => {
    commitExpandedRef.current = commit;
  }, []);

  const handleStatusToggle = async () => {
    setToggling(true);
    try {
      await onPatch(link.id, { status: link.status === 'active' ? 'paused' : 'active' });
    } catch {
      // onPatch surfaces its own toast; the switch just returns to its real state.
    } finally {
      setToggling(false);
    }
  };

  /**
   * Collapsing is also a save point: it flushes every pending edit and refuses
   * to close if any of them is invalid, so a card can never be folded away
   * hiding a problem.
   */
  const handleToggleExpand = async () => {
    if (expanded) {
      const destinationOk = await destination.commit();
      const expandedOk = commitExpandedRef.current ? await commitExpandedRef.current() : true;

      if (!destinationOk || !expandedOk) {
        onToast('error', 'Fix the highlighted fields before collapsing this link');
        return;
      }
    }
    onToggleExpand();
  };

  const paused = link.status !== 'active';
  const reason = pauseReason(link);

  return (
    <article
      className={`relative bg-white border rounded-lg transition-all duration-300 ${
        paused ? 'border-neutral-200 opacity-90' : 'border-gray-100 hover:shadow-lg hover:border-gray-200'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-lg font-bold text-black truncate">{link.name}</h2>
              {paused && (
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                  {reason ? reason.toUpperCase() : 'PAUSED'}
                </span>
              )}
              {link.interstitialEnabled && (
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                  ANIMATED
                </span>
              )}
            </div>
            {!expanded && link.description && (
              <p className="text-sm font-normal text-neutral-600 mb-2 line-clamp-2">
                {link.description}
              </p>
            )}
            <ShortLinkDisplay
              slug={link.slug}
              onCopied={() => onToast('success', 'Short link copied')}
              onCopyFailed={(message) => onToast('error', message)}
            />
          </div>

          <div className="relative flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2 py-1 flex-shrink-0">
            <ToggleSwitch
              checked={link.status === 'active'}
              onChange={handleStatusToggle}
              disabled={toggling}
              loading={toggling}
              ariaLabel="Toggle link active"
            />

            <KebabMenu
              width="w-44"
              items={[
                { label: 'Stats', icon: <BarChart3 size={15} />, onClick: onOpenStats },
                { label: 'Generate QR', icon: <QrCode size={15} />, onClick: onOpenQr },
                { label: 'Delete', icon: <Trash2 size={15} />, variant: 'danger', onClick: onDelete },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
          <div>
            <label
              htmlFor={`destination-${link.id}`}
              className="block text-xs font-medium text-neutral-500 mb-1.5"
            >
              Destination
            </label>
            <input
              id={`destination-${link.id}`}
              type="url"
              value={destination.value}
              onChange={(e) => destination.setValue(e.target.value)}
              onBlur={() => void destination.commit()}
              disabled={destination.saving}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                destination.error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-neutral-300 focus:ring-black focus:border-transparent'
              } disabled:bg-neutral-100`}
            />
            {destination.error && <p className="mt-1.5 text-sm text-red-600">{destination.error}</p>}
          </div>

          <div className="text-right sm:pt-6">
            <p className="text-2xl font-bold text-black leading-none">{link.clickCount}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {link.clickCount === 1 ? 'click' : 'clicks'}
              {link.maxClicks != null && ` / ${link.maxClicks}`}
            </p>
          </div>
        </div>
      </div>

      {expanded && (
        <LinkCardExpanded
          link={link}
          onPatch={(patch) => onPatch(link.id, patch)}
          onError={onError}
          onEditInterstitial={onEditInterstitial}
          onOpenStats={onOpenStats}
          onValidityChange={setExpandedValid}
          registerCommit={registerCommit}
        />
      )}

      <button
        type="button"
        onClick={handleToggleExpand}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse link' : 'Expand link'}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-neutral-500 hover:text-black hover:bg-neutral-50 border-t border-neutral-100 rounded-b-lg transition-colors"
      >
        {expanded ? (
          <>
            {expandedValid ? 'Collapse' : 'Fix errors to collapse'}
            <ChevronUp size={15} />
          </>
        ) : (
          <>
            More
            <ChevronDown size={15} />
          </>
        )}
      </button>
    </article>
  );
}
