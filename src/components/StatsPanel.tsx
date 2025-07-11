import React, { FC, useMemo } from 'react';
import { Eye, Share2 } from 'lucide-react';
import { designTokens } from '../styles/tokens';

interface StatsPanelProps {
  views: number;
  channels?: string[]; // Optional, safer
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  children?: React.ReactNode;
}

const formatNumber = (n: number) => {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

const StatCard: FC<StatCardProps> = ({ icon, label, value, children }) => {
  return (
    <div
      className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100 transform transition-transform hover:scale-[1.02] hover:shadow-xl"
    >
      <div
        className="p-4 bg-gray-50 rounded-full mb-6 border border-gray-200"
      >
        {icon}
      </div>
      <div
        className="text-6xl font-extrabold mb-2"
        style={{
          fontFamily: designTokens?.typography?.fontFamily ?? 'sans-serif',
          fontWeight: designTokens?.typography?.weights?.extraBold ?? 700,
          color: designTokens?.colors?.black ?? '#000',
        }}
      >
        {value}
      </div>
      <div
        className="text-lg uppercase tracking-wider text-gray-600 mb-4"
        style={{
          fontFamily: designTokens?.typography?.fontFamily ?? 'sans-serif',
          fontWeight: designTokens?.typography?.weights?.medium ?? 500,
          letterSpacing: designTokens?.typography?.letterSpacings?.wide ?? '0.1em',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
};

const StatsPanel: FC<StatsPanelProps> = ({ views = 0, channels = [] }) => {
  const formattedViews = useMemo(() => formatNumber(views), [views]);

  return (
    <section className="bg-gray-50 py-24">
      <div className="container mx-auto px-6 lg:px-12">
        <h2
          className="text-3xl font-bold text-center mb-12"
          style={{
            fontFamily: designTokens?.typography?.fontFamily ?? 'sans-serif',
            fontWeight: designTokens?.typography?.weights?.black ?? 900,
            color: designTokens?.colors?.gray?.[800] ?? '#333',
          }}
        >
          Audience Statistics
        </h2>
        <div className="grid gap-12 grid-cols-1 md:grid-cols-2">
          <StatCard
            icon={<Eye size={32} className="text-gray-600" />}
            label="Total Views"
            value={formattedViews}
          />

          <StatCard
            icon={<Share2 size={32} className="text-gray-600" />}
            label="Platforms"
            value={channels.length}
          >
            <ul className="flex flex-wrap justify-center gap-3 mt-4">
              {channels.map((ch, i) => (
                <li key={i}>
                  <span
                    className="px-4 py-2 bg-white rounded-full border border-gray-200 text-sm font-medium transition hover:shadow-sm"
                    style={{
                      fontFamily: designTokens?.typography?.fontFamily ?? 'sans-serif',
                      fontWeight: designTokens?.typography?.weights?.regular ?? 400,
                      letterSpacing: designTokens?.typography?.letterSpacings?.wide ?? '0.1em',
                    }}
                  >
                    {ch}
                  </span>
                </li>
              ))}
            </ul>
          </StatCard>
        </div>
      </div>
    </section>
  );
};

export default React.memo(StatsPanel);