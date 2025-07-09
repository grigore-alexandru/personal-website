import React from 'react';
import { Eye, Users, Share2 } from 'lucide-react';
import { designTokens } from '../styles/tokens';

interface StatsPanelProps {
  views: number;
  channels: string[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ views, channels }) => {
  const formatViews = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="flex flex-wrap items-center gap-8 py-6 border-y border-gray-200">
      <div className="flex items-center gap-3">
        <Eye size={20} className="text-gray-600" />
        <div>
          <span 
            className="text-2xl font-bold text-black"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
            }}
          >
            {formatViews(views)}
          </span>
          <span 
            className="text-sm text-gray-600 ml-2"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.regular,
            }}
          >
            Views
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Users size={20} className="text-gray-600" />
        <div>
          <span 
            className="text-2xl font-bold text-black"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
            }}
          >
            {channels.length}
          </span>
          <span 
            className="text-sm text-gray-600 ml-2"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.regular,
            }}
          >
            Channels
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Share2 size={20} className="text-gray-600" />
        <div className="flex flex-wrap gap-2">
          {channels.map((channel, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
                letterSpacing: designTokens.typography.letterSpacings.wide,
              }}
            >
              {channel}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;