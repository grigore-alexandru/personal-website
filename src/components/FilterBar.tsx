import React from 'react';
import { Filter } from '../types';
import { designTokens } from '../styles/tokens';

interface FilterBarProps {
  filters: Filter[];
  onFilterChange: (filterId: string) => void;
  isVisible: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, isVisible }) => {
  return (
    <div 
      className={`fixed top-20 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
      style={{ 
        borderBottom: `1px solid ${designTokens.colors.shadow}`,
      }}
    >
      <div className="max-w-screen-xl mx-auto px-6 py-4">
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              aria-pressed={filter.active}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black ${
                filter.active 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
                letterSpacing: designTokens.typography.letterSpacings.wide,
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;