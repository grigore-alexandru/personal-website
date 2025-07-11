import React, { FC, useMemo } from 'react';
import { Eye, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { designTokens } from '../styles/tokens';

interface StatsPanelProps {
  views: number;
  channels: string[];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  children?: React.ReactNode;
}

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

const StatCard: FC<StatCardProps> = ({ icon, label, value, children }) => {
  return (
    <motion.div
      className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.03, boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
    >
      <div
        className="p-4 bg-gray-50 rounded-full mb-6"
        style={{ border: `1px solid ${designTokens.colors.gray[200]}` }}
      >
        {icon}
      </div>
      <div
        className="text-6xl font-extrabold mb-2"
        style={{
          fontFamily: designTokens.typography.fontFamily,
          fontWeight: designTokens.typography.weights.extraBold,
          color: designTokens.colors.black,
        }}
      >
        {value}
      </div>
      <div
        className="text-lg uppercase tracking-wider text-gray-600 mb-4"
        style={{
          fontFamily: designTokens.typography.fontFamily,
          fontWeight: designTokens.typography.weights.medium,
          letterSpacing: designTokens.typography.letterSpacings.wide,
        }}
      >
        {label}
      </div>
      {children}
    </motion.div>
  );
};

const StatsPanel: FC<StatsPanelProps> = ({ views, channels }) => {
  const formattedViews = useMemo(() => formatNumber(views), [views]);

  return (
    <section className="bg-gray-50 py-24">
      <div className="container mx-auto px-6 lg:px-12">
        <h2
          className="text-3xl font-bold text-center mb-12"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.black,
            color: designTokens.colors.gray[800],
          }}
        >
          Audience Statistics
        </h2>
        <div className="grid gap-12 grid-cols-1 md:grid-cols-2">
          {/* Total Views */}
          <StatCard
            icon={<Eye size={32} className="text-gray-600" />}
            label="Total Views"
            value={formattedViews}
          />

          {/* Distribution */}
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
                      fontFamily: designTokens.typography.fontFamily,
                      fontWeight: designTokens.typography.weights.regular,
                      letterSpacing: designTokens.typography.letterSpacings.wide,
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