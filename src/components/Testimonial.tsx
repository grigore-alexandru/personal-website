import React from 'react';
import { Quote } from 'lucide-react';
import { designTokens } from '../styles/tokens';

interface TestimonialProps {
  client: string;
  text: string;
  role?: string;
}

const Testimonial: React.FC<TestimonialProps> = ({ client, text, role }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-8 relative">
      {/* Quote Mark */}
      <Quote 
        size={48} 
        className="absolute top-4 left-4 text-gray-300"
        style={{ transform: 'rotate(180deg)' }}
      />
      
      <div className="relative z-10">
        <blockquote 
          className="text-lg text-gray-800 mb-6 italic"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.regular,
            lineHeight: designTokens.typography.lineHeights.body,
          }}
        >
          "{text}"
        </blockquote>
        
        <div>
          <cite 
            className="text-black font-medium not-italic block"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
            }}
          >
            {client}
          </cite>
          {role && (
            <p 
              className="text-gray-600 text-sm mt-1"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
              }}
            >
              {role}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Testimonial;