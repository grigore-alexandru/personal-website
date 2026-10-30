'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CalendarDays, Check, CloudOff, Database, Loader2, Map, MapPin, Sun, Ticket, Wallet } from 'lucide-react';
import { useTrip, type SyncState } from './TripProvider';
import { TABS } from './tripConfig';
import { AiProvider, AskAiButton } from './ai';

const ICONS = { sun: Sun, calendar: CalendarDays, map: Map, pin: MapPin, ticket: Ticket, wallet: Wallet } as const;

const SYNC: Record<SyncState, { label: string; Icon: typeof Check; className: string }> = {
  saved: { label: 'Salvat', Icon: Check, className: 'text-green-700' },
  saving: { label: 'Se salvează…', Icon: Loader2, className: 'text-neutral-600 [&>svg]:animate-spin' },
  offline: { label: 'Offline — doar citire', Icon: CloudOff, className: 'text-amber-700' },
  cache: { label: 'Din cache', Icon: Database, className: 'text-neutral-500' },
};

/** Header with sync status, top tabs from 768 px, bottom tab bar below. */
export function TripShell({ children }: { children: ReactNode }) {
  const { sync } = useTrip();
  const pathname = usePathname() ?? '';
  const s = SYNC[sync];
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <AiProvider>
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[960px] mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href={TABS[0].href} className="text-lg font-bold tracking-tight">
            San Francisco
          </Link>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.className}`} aria-live="polite" title={s.label}>
              <s.Icon size={14} />
              <span className={sync === 'saved' ? 'hidden sm:inline' : ''}>{s.label}</span>
            </span>
            <AskAiButton />
          </div>
        </div>
        <nav className="hidden md:block max-w-[960px] mx-auto px-4" aria-label="Secțiuni">
          <ul className="flex gap-1">
            {TABS.map((t) => {
              const Icon = ICONS[t.icon];
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={active(t.href) ? 'page' : undefined}
                    className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 ${
                      active(t.href) ? 'border-black text-black' : 'border-transparent text-neutral-500 hover:text-black'
                    }`}
                  >
                    <Icon size={16} />
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="max-w-[960px] mx-auto px-4 pt-4 pb-28 md:pb-12">{children}</main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-neutral-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Secțiuni"
      >
        <ul className="grid grid-cols-6">
          {TABS.map((t) => {
            const Icon = ICONS[t.icon];
            const on = active(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-semibold ${on ? 'text-black' : 'text-neutral-400'}`}
                >
                  <Icon size={20} strokeWidth={on ? 2.4 : 2} />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
    </AiProvider>
  );
}
