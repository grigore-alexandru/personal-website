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
      <div className="max-w-screen-xl mx-auto px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Total Views */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-100 rounded-full flex items-center justify-center mr-6">
                <Eye size={28} className="text-gray-700 lg:w-8 lg:h-8" />
              </div>
              <div>
                <div 
                  className="text-5xl lg:text-6xl font-bold text-black mb-2"
                  style={{
                    fontFamily: designTokens.typography.fontFamily,
                    fontWeight: designTokens.typography.weights.bold,
                  }}
                >
                  {formatViews(views)}
                </div>
                <div 
                  className="text-lg lg:text-xl text-gray-600 uppercase tracking-wider"
                  style={{
                    fontFamily: designTokens.typography.fontFamily,
                    fontWeight: designTokens.typography.weights.regular,
                    letterSpacing: designTokens.typography.letterSpacings.wide,
                  }}
                >
                  Total Views
                </div>
              </div>
            </div>
            <p 
              className="text-gray-500 text-sm lg:text-base max-w-md mx-auto lg:mx-0"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
              }}
            >
              Cumulative reach across all distribution platforms and channels
            </p>
          </div>

          {/* Distribution */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-100 rounded-full flex items-center justify-center mr-6">
                <Share2 size={28} className="text-gray-700 lg:w-8 lg:h-8" />
              </div>
              <div>
                <div 
                  className="text-5xl lg:text-6xl font-bold text-black mb-2"
                  style={{
                    fontFamily: designTokens.typography.fontFamily,
                    fontWeight: designTokens.typography.weights.bold,
                  }}
                >
                  {channels.length}
                </div>
                <div 
                  className="text-lg lg:text-xl text-gray-600 uppercase tracking-wider"
                  style={{
                    fontFamily: designTokens.typography.fontFamily,
                    fontWeight: designTokens.typography.weights.regular,
                    letterSpacing: designTokens.typography.letterSpacings.wide,
                  }}
                >
                  Distribution
                </div>
              </div>
            </div>
            
            {/* Platform Tags - Positioned close to distribution */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-4">
              {channels.map((channel, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200 hover:bg-gray-200 transition-colors"
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
            
            <p 
              className="text-gray-500 text-sm lg:text-base max-w-md mx-auto lg:mx-0"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
              }}
            >
              Strategic multi-platform distribution for maximum audience reach
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;