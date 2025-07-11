import React, { FC } from 'react';
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

          {/* Card 2: Number of Channels */}
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

          {/* Card 3: Distribution Platforms */}
<div className="flex flex-col items-center text-center bg-white rounded-2xl p-8">
  <div className="mb-4">
    <h3
      className="text-xl font-bold mb-2"
      style={{
        fontFamily: designTokens?.typography?.fontFamily,
        fontWeight: designTokens?.typography?.weights?.bold,
        color: designTokens?.colors?.gray?.[800] ?? '#333',
      }}
    >
      Our Distribution Platforms
    </h3>
    <p
      className="text-sm text-gray-500 max-w-xs mx-auto"
      style={{
        fontFamily: designTokens?.typography?.fontFamily,
        fontWeight: designTokens?.typography?.weights?.regular,
        letterSpacing: designTokens?.typography?.letterSpacings?.normal,
      }}
    >
      Delivering your content seamlessly across channels.
    </p>
  </div>
  
  <div className="mt-6 w-full max-w-lg mx-auto grid gap-4"
       style={{
         gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
       }}>
    {channels.map((channel, i) => (
      <span
        key={i}
        className="text-center px-4 py-2 rounded-full bg-gray-50 text-gray-700 text-sm font-medium transition hover:bg-gray-100"
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
</div>
          
        </div>
      </div>
    </section>
  );
};

export default React.memo(StatsPanel);