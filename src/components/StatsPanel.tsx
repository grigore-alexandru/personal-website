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

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const StatsPanel: FC<StatsPanelProps> = ({
  views = 0,
  channels = [],
  impressions = 0,
}) => {
  const metrics = [
    {
      key: 'channels',
      icon: <Share2 size={36} />,
      value: channels.length,
      label: 'Channels',
      isCenter: false,
    },
    {
      key: 'views',
      icon: <Eye size={48} />,
      value: views,
      label: 'Total Views',
      isCenter: true,
    },
    {
      key: 'impressions',
      icon: <TrendingUp size={36} />,
      value: impressions,
      label: 'Impressions',
      isCenter: false,
    },
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
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.black,
            color: designTokens.colors.gray[800],
          }}
        >
          Audience Statistics
        </motion.h2>

        <motion.div
          className="flex justify-center items-center space-x-16"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {metrics.map((m) => (
            <motion.div
              key={m.key}
              variants={cardVariants}
              className="flex flex-col items-center text-center"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: m.isCenter ? 1.2 : 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="mb-4"
                style={{
                  color: m.isCenter
                    ? designTokens.colors.primary
                    : designTokens.colors.gray[600],
                }}
              >
                {m.icon}
              </motion.div>

              {/* Number */}
              <motion.div
                initial={m.isCenter ? { scale: 0.9, opacity: 0 } : { opacity: 0 }}
                animate={m.isCenter
                  ? { scale: [1, 1.05, 1], opacity: 1 }
                  : { opacity: 1 }}
                transition={
                  m.isCenter
                    ? { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }
                    : { duration: 0.6, ease: 'easeOut' }
                }
                className={
                  m.isCenter
                    ? 'text-8xl font-extrabold mb-2'
                    : 'text-6xl font-extrabold mb-2'
                }
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: m.isCenter
                    ? designTokens.typography.weights.extraBold
                    : designTokens.typography.weights.bold,
                  color: m.isCenter
                    ? designTokens.colors.primary
                    : designTokens.colors.black,
                }}
              >
                <AnimatedNumber value={m.value} format={formatNumber} />
              </motion.div>

              {/* Label */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4, ease: 'easeOut' }}
                className="text-lg uppercase tracking-wider"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.medium,
                  letterSpacing: designTokens.typography.letterSpacings.wide,
                  color: designTokens.colors.gray[500],
                }}
              >
                {m.label}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default React.memo(StatsPanel);