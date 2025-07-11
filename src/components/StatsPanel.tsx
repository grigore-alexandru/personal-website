import React from 'react';
import { Eye, Users, Share2, TrendingUp } from 'lucide-react';
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
    <div className="relative bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      
      {/* Gradient Overlays */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <div className="relative max-w-screen-xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Views Stat */}
          <div className="text-center group">
            <div className="relative inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 mb-6 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <Eye size={28} className="text-white lg:w-8 lg:h-8" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div 
                className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.bold,
                }}
              >
                {formatViews(views)}
              </div>
              <div 
                className="text-lg lg:text-xl text-white/80 uppercase tracking-wider"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.regular,
                  letterSpacing: designTokens.typography.letterSpacings.wide,
                }}
              >
                Total Views
              </div>
              <div className="text-sm text-white/60">
                Across all platforms
              </div>
            </div>
          </div>

          {/* Channels Stat */}
          <div className="text-center group">
            <div className="relative inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 mb-6 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-teal-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <Users size={28} className="text-white lg:w-8 lg:h-8" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div 
                className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.bold,
                }}
              >
                {channels.length}
              </div>
              <div 
                className="text-lg lg:text-xl text-white/80 uppercase tracking-wider"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.regular,
                  letterSpacing: designTokens.typography.letterSpacings.wide,
                }}
              >
                Platforms
              </div>
              <div className="text-sm text-white/60">
                Distribution channels
              </div>
            </div>
          </div>

          {/* Reach Stat */}
          <div className="text-center group">
            <div className="relative inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 mb-6 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp size={28} className="text-white lg:w-8 lg:h-8" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div 
                className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.bold,
                }}
              >
                100%
              </div>
              <div 
                className="text-lg lg:text-xl text-white/80 uppercase tracking-wider"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.regular,
                  letterSpacing: designTokens.typography.letterSpacings.wide,
                }}
              >
                Impact
              </div>
              <div className="text-sm text-white/60">
                Client satisfaction
              </div>
            </div>
          </div>
        </div>

        {/* Platform Tags */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {channels.map((channel, index) => (
            <div
              key={index}
              className="group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-full blur-sm group-hover:blur-md transition-all duration-300" />
              <span
                className="relative px-6 py-3 bg-white/10 backdrop-blur-sm text-white/90 text-sm rounded-full border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-300 group-hover:scale-105"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.regular,
                  letterSpacing: designTokens.typography.letterSpacings.wide,
                }}
              >
                {channel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;