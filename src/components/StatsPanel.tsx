import React from 'react';
import { Eye, Share2 } from 'lucide-react';
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
    <div className="bg-white border-t border-b border-gray-100">
      <div className="max-w-screen-xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          
          {/* Total Views */}
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-gray-100">
              <Eye size={32} className="text-gray-600" />
            </div>
            <div 
              className="text-7xl font-bold text-black mb-4"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.bold,
              }}
            >
              {formatViews(views)}
            </div>
            <div 
              className="text-xl text-gray-600 uppercase tracking-wider"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
                letterSpacing: designTokens.typography.letterSpacings.wide,
              }}
            >
              Total Views
            </div>
          </div>

          {/* Distribution */}
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-gray-100">
              <Share2 size={32} className="text-gray-600" />
            </div>
            <div 
              className="text-7xl font-bold text-black mb-4"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.bold,
              }}
            >
              {channels.length}
            </div>
            <div 
              className="text-xl text-gray-600 uppercase tracking-wider mb-8"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
                letterSpacing: designTokens.typography.letterSpacings.wide,
              }}
            >
              Distribution
            </div>
            
            {/* Platform Tags - Elegantly positioned */}
            <div className="flex flex-wrap justify-center gap-3">
              {channels.map((channel, index) => (
                <span
                  key={index}
                  className="px-6 py-3 bg-gray-50 text-gray-700 text-sm rounded-full border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 font-medium"
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
      </div>
    </div>
  );
};

export default StatsPanel;