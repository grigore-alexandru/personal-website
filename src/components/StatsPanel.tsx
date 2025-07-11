import React, { FC } from 'react';
import { Eye, Share2, TrendingUp } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import { motion } from 'framer-motion';
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

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.2,
      duration: 0.6,
      ease: 'easeOut',
    },
  }),
};

const StatsPanel: FC<StatsPanelProps> = ({ views = 0, channels = [], impressions = 0 }) => {
  const metrics = [
    { icon: <Share2 size={36} />, value: channels.length, label: 'Channels' },
    { icon: <Eye size={36} />, value: views, label: 'Total Views' },
    { icon: <TrendingUp size={36} />, value: impressions, label: 'Impressions' }
  ];

  return (
    <section className="bg-gray-50 py-24">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-3xl font-bold text-center mb-16"
          style={{
            fontFamily: designTokens?.typography?.fontFamily ?? 'sans-serif',
            fontWeight: designTokens?.typography?.weights?.black ?? 900,
            color: designTokens?.colors?.gray?.[800] ?? '#333',
          }}
        >
          Audience Statistics
        </motion.h2>

        <div className="grid gap-12 md:grid-cols-3 text-center">
          {metrics.map((item, i) => (
            <motion.div
              key={item.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.2 + 0.3, duration: 0.4 }}
                className="mb-4 text-gray-600"
              >
                {item.icon}
              </motion.div>
              <AnimatedNumber
                value={item.value}
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
                {item.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default React.memo(StatsPanel);