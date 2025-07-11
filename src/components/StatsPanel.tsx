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
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 0.6, ease: 'easeOut' }
  })
};

const StatsPanel: FC<StatsPanelProps> = ({ views = 0, channels = [], impressions = 0 }) => {
  const metrics = [
    {
      icon: <Share2 size={32} />,
      value: channels.length,
      label: 'Channels',
      highlight: false,
    },
    {
      icon: <Eye size={48} />,  // larger center icon
      value: views,
      label: 'Total Views',
      highlight: true,
    },
    {
      icon: <TrendingUp size={32} />,
      value: impressions,
      label: 'Impressions',
      highlight: false,
    }
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
            fontFamily: designTokens?.typography?.fontFamily,
            fontWeight: designTokens?.typography?.weights?.black,
            color: designTokens?.colors?.gray?.[800],
          }}
        >
          Audience Statistics
        </motion.h2>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } }
          }}
          className="flex justify-center items-center space-x-16"
        >
          {metrics.map((item, i) => (
            <motion.div
              key={item.label}
              custom={i}
              variants={cardVariants}
              className="flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: item.highlight ? 1.2 : 1, opacity: 1 }}
                transition={{ delay: i * 0.2 + 0.2, duration: 0.4, ease: 'easeOut' }}
                className="mb-4"
                style={{ color: item.highlight ? designTokens?.colors?.primary ?? '#3b82f6' : designTokens?.colors?.gray?.[600] }}
              >
                {item.icon}
              </motion.div>

              <motion.div
                initial={item.highlight ? { scale: 0.9, opacity: 0 } : { opacity: 0 }}
                animate={item.highlight ? { scale: 1, opacity: 1 } : { opacity: 1 }}
                transition={{ delay: i * 0.2 + 0.4, duration: 0.5, ease: 'easeOut' }}
                className={item.highlight ? 'text-8xl font-extrabold mb-2' : 'text-5xl font-bold mb-2'}
                style={{
                  fontFamily: designTokens?.typography?.fontFamily,
                  fontWeight: item.highlight ? designTokens?.typography?.weights?.extraBold : designTokens?.typography?.weights?.bold,
                  color: item.highlight ? designTokens?.colors?.primary ?? '#3b82f6' : designTokens?.colors?.black,
                }}
              >
                <AnimatedNumber value={item.value} format={formatNumber} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.2 + 0.6, duration: 0.4 }}
                className="text-lg uppercase tracking-wider"
                style={{
                  fontFamily: designTokens?.typography?.fontFamily,
                  fontWeight: designTokens?.typography?.weights?.medium,
                  letterSpacing: designTokens?.typography?.letterSpacings?.wide,
                  color: designTokens?.colors?.gray?.[500],
                }}
              >
                {item.label}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default React.memo(StatsPanel);