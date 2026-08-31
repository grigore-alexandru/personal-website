'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { loadLinkStats } from '../../utils/linksService';
import { formatDistanceToNow } from '../../utils/dateUtils';
import type { Link, LinkStats } from '../../types/links';

interface LinkStatsModalProps {
  open: boolean;
  link: Link | null;
  onClose: () => void;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
      <p className="text-2xl font-bold text-black leading-none">{value}</p>
      <p className="text-xs text-neutral-500 mt-1.5">{label}</p>
    </div>
  );
}

/** Thirty plain divs. A charting library would be more code than the chart. */
function DailyChart({ daily }: { daily: LinkStats['daily'] }) {
  const peak = Math.max(1, ...daily.map((d) => d.clicks));

  return (
    <div>
      <div className="flex items-end gap-[3px] h-28">
        {daily.map((day) => (
          <div key={day.day} className="flex-1 flex flex-col justify-end h-full group relative">
            <div
              className={`w-full rounded-sm transition-colors ${
                day.clicks > 0 ? 'bg-black group-hover:bg-neutral-700' : 'bg-neutral-200'
              }`}
              style={{ height: day.clicks > 0 ? `${Math.max(6, (day.clicks / peak) * 100)}%` : '2px' }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-black text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {day.clicks} on {new Date(day.day).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-neutral-400">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export function LinkStatsModal({ open, link, onClose }: LinkStatsModalProps) {
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !link) return;

    let cancelled = false;
    setStats(null);
    setError(null);

    loadLinkStats(link.id)
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load stats');
      });

    return () => {
      cancelled = true;
    };
  }, [open, link]);

  if (!link) return null;

  const deviceTotal = stats
    ? stats.devices.mobile + stats.devices.desktop + stats.devices.tablet
    : 0;

  const percent = (n: number) => (deviceTotal ? Math.round((n / deviceTotal) * 100) : 0);

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Stats" subtitle={link.name}>
      {error ? (
        <p className="text-sm text-red-600 py-8 text-center">{error}</p>
      ) : !stats ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-gray-400 animate-spin" />
        </div>
      ) : stats.totalClicks === 0 ? (
        <p className="text-center text-neutral-500 py-16">
          No clicks yet. Share the link and check back.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Total clicks" value={String(stats.totalClicks)} />
            <StatTile label="Unique visitors" value={String(stats.uniqueClicks)} />
            <StatTile
              label="Last clicked"
              value={stats.lastClickedAt ? formatDistanceToNow(stats.lastClickedAt) : '—'}
            />
          </div>

          <div>
            <h4 className="text-sm font-medium text-black mb-3">Clicks over the last 30 days</h4>
            <DailyChart daily={stats.daily} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-black mb-3">Devices</h4>
              <div className="space-y-2">
                {([
                  ['Mobile', stats.devices.mobile],
                  ['Desktop', stats.devices.desktop],
                  ['Tablet', stats.devices.tablet],
                ] as const).map(([label, count]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-sm text-neutral-600 w-16 flex-shrink-0">{label}</span>
                    <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: `${percent(count)}%` }} />
                    </div>
                    <span className="text-sm text-neutral-500 w-12 text-right flex-shrink-0">
                      {percent(count)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-black mb-3">Top referrers</h4>
              <ul className="space-y-2">
                {stats.referrers.map((entry) => (
                  <li key={entry.referrer} className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-neutral-700 truncate">{entry.referrer}</span>
                    <span className="text-sm font-medium text-black flex-shrink-0">{entry.clicks}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
