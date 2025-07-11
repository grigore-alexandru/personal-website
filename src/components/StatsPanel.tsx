import React, { FC, useMemo } from 'react';
import { Eye, Share2 } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import { designTokens } from '../styles/tokens';

interface StatsPanelProps {
  views: number;
  channels?: string[];
}

const formatNumber = (n: number) => {
  if (isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
};

const StatsPanel: FC<StatsPanelProps> = ({ views = 0, channels = [] }) => {
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

        <div className="grid gap-16 md:grid-cols-2">
          
          {/* Total Views */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-6">
              <Eye size={36} className="text-gray-600" />
            </div>
            <AnimatedNumber
              value={views}
              format={formatNumber}
              className="text-7xl font-extrabold"
            />
            <div
              className="mt-2 text-lg uppercase tracking-wider text-gray-500"
              style={{
                fontFamily: designTokens?.typography?.fontFamily,
                fontWeight: designTokens?.typography?.weights?.medium,
                letterSpacing: designTokens?.typography?.letterSpacings?.wide,
              }}
            >
              Total Views
            </div>
          </div>

          {/* Distribution */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-6">
              <Share2 size={36} className="text-gray-600" />
            </div>
            <AnimatedNumber
              value={channels.length}
              format={(n) => n.toFixed(0)}
              className="text-7xl font-extrabold"
            />
            <div
              className="mt-2 text-lg uppercase tracking-wider text-gray-500 mb-8"
              style={{
                fontFamily: designTokens?.typography?.fontFamily,
                fontWeight: designTokens?.typography?.weights?.medium,
                letterSpacing: designTokens?.typography?.letterSpacings?.wide,
              }}
            >
              Platforms
            </div>

            {channels.length > 0 && (
              <>
                <h3
                  className="text-base uppercase tracking-wider text-gray-400 mb-4"
                  style={{
                    fontFamily: designTokens?.typography?.fontFamily,
                    fontWeight: designTokens?.typography?.weights?.regular,
                    letterSpacing: designTokens?.typography?.letterSpacings?.wide,
                  }}
                >
                  Platforms Included
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-lg">
                  {channels.map((channel, i) => (
                    <span
                      key={i}
                      className="text-center px-4 py-2 rounded-full bg-white text-gray-700 text-sm transition"
                      style={{
                        fontFamily: designTokens?.typography?.fontFamily,
                        fontWeight: designTokens?.typography?.weights?.regular,
                        letterSpacing: designTokens?.typography?.letterSpacings?.wide,
                      }}
                    >
                      {channel}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

export default React.memo(StatsPanel);