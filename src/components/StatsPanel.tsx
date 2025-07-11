import React, { FC } from 'react';
import { Eye, Share2, TrendingUp } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import { designTokens } from '../styles/tokens';

interface StatsPanelProps {
  views: number;
  channels?: string[];
  impressions: number;
}

const formatNumber = (n: number) => {
  if (isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
};

const StatsPanel: FC<StatsPanelProps> = ({ views = 0, channels = [], impressions = 0 }) => {
  return (
    <section className="bg-gray-50 py-24">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <h2
          className="text-3xl font-bold text-center mb-16"
          style={{
            fontFamily: designTokens?.typography?.fontFamily ?? 'sans-serif',
            fontWeight: designTokens?.typography?.weights?.black ?? 900,
            color: designTokens?.colors?.gray?.[800] ?? '#333',
          }}
        >
          Audience Statistics
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          
          {/* Card 1: Total Views */}
          <div className="flex flex-col items-center text-center bg-white rounded-2xl p-8">
            <Eye size={36} className="text-gray-600 mb-4" />
            <AnimatedNumber
              value={views}
              format={formatNumber}
              className="text-6xl font-extrabold mb-2"
            />
            <div
              className="text-lg uppercase tracking-wider text-gray-500"
              style={{
                fontFamily: designTokens?.typography?.fontFamily,
                fontWeight: designTokens?.typography?.weights?.medium,
                letterSpacing: designTokens?.typography?.letterSpacings?.wide,
              }}
            >
              Total Views
            </div>
          </div>

          {/* Card 2: Platforms */}
          <div className="flex flex-col items-center text-center bg-white rounded-2xl p-8">
            <Share2 size={36} className="text-gray-600 mb-4" />
            <AnimatedNumber
              value={channels.length}
              format={(n) => n.toFixed(0)}
              className="text-6xl font-extrabold mb-2"
            />
            <div
              className="text-lg uppercase tracking-wider text-gray-500"
              style={{
                fontFamily: designTokens?.typography?.fontFamily,
                fontWeight: designTokens?.typography?.weights?.medium,
                letterSpacing: designTokens?.typography?.letterSpacings?.wide,
              }}
            >
              Platforms
            </div>
          </div>

          {/* Card 3: Impressions */}
          <div className="flex flex-col items-center text-center bg-white rounded-2xl p-8">
            <TrendingUp size={36} className="text-gray-600 mb-4" />
            <AnimatedNumber
              value={impressions}
              format={formatNumber}
              className="text-6xl font-extrabold mb-2"
            />
            <div
              className="text-lg uppercase tracking-wider text-gray-500"
              style={{
                fontFamily: designTokens?.typography?.fontFamily,
                fontWeight: designTokens?.typography?.weights?.medium,
                letterSpacing: designTokens?.typography?.letterSpacings?.wide,
              }}
            >
              Impressions
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default React.memo(StatsPanel);