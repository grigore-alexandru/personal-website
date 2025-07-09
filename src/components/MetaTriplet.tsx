import React from 'react';
import { designTokens } from '../styles/tokens';

interface MetaTripletProps {
  type: string;
  client: string;
  date: string;
}

const MetaTriplet: React.FC<MetaTripletProps> = ({ type, client, date }) => {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-wrap items-center gap-6 text-sm">
      <span 
        className="uppercase font-medium"
        style={{
          fontFamily: designTokens.typography.fontFamily,
          fontWeight: designTokens.typography.weights.regular,
          letterSpacing: designTokens.typography.letterSpacings.wide,
          color: designTokens.colors.textSecondary,
        }}
      >
        {type}
      </span>
      
      <span className="text-gray-300">•</span>
      
      <span 
        className="uppercase font-medium"
        style={{
          fontFamily: designTokens.typography.fontFamily,
          fontWeight: designTokens.typography.weights.regular,
          letterSpacing: designTokens.typography.letterSpacings.wide,
          color: designTokens.colors.textSecondary,
        }}
      >
        {client}
      </span>
      
      <span className="text-gray-300">•</span>
      
      <span 
        className="uppercase font-medium"
        style={{
          fontFamily: designTokens.typography.fontFamily,
          fontWeight: designTokens.typography.weights.regular,
          letterSpacing: designTokens.typography.letterSpacings.wide,
          color: designTokens.colors.textSecondary,
        }}
      >
        {formattedDate}
      </span>
    </div>
  );
};

export default MetaTriplet;