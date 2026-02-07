import React from 'react';
import { motion } from 'framer-motion';
import { TipTapContent } from '../../types';
import { designTokens } from '../../styles/tokens';
import TipTapRenderer from './TipTapRenderer';

interface RecommendationProps {
  name: string;
  role?: string;
  text: TipTapContent;
}

const Recommendation: React.FC<RecommendationProps> = ({ name, role, text }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="max-w-3xl mx-auto"
    >
      <div className="border-t-2 border-black pt-8">
        <div className="mb-6">
          <TipTapRenderer content={text} className="recommendation-text" />
        </div>

        <div>
          <span
            className="block"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontSize: designTokens.typography.sizes.sm,
              fontWeight: designTokens.typography.weights.bold,
              color: designTokens.colors.textPrimary,
            }}
          >
            {name}
          </span>
          {role && (
            <span
              className="block mt-1"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.xs,
                fontWeight: designTokens.typography.weights.regular,
                color: designTokens.colors.textSecondary,
              }}
            >
              {role}
            </span>
          )}
        </div>
      </div>

      <style>{`
        .recommendation-text p {
          font-style: italic;
          color: rgb(55, 65, 81);
        }
        .recommendation-text p::before { content: '\\201C'; }
        .recommendation-text p:last-of-type::after { content: '\\201D'; }
      `}</style>
    </motion.div>
  );
};

export default Recommendation;
