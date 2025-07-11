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
    <div
      className="relative bg-white rounded-2xl p-10 md:p-12 overflow-hidden"
      style={{
        border: `1px solid ${designTokens?.colors?.gray?.[100] ?? '#eee'}`,
        boxShadow: `0 2px 8px rgba(0, 0, 0, 0.03)`,
      }}
    >
      {/* Decorative Quote Icon */}
      <Quote
        size={120}
        className="absolute -top-8 -left-8 text-gray-100 opacity-40"
        style={{
          transform: 'rotate(180deg)',
          pointerEvents: 'none',
        }}
      />

      <div className="relative z-10">
        <blockquote
          className="text-xl md:text-2xl text-gray-700 italic leading-relaxed mb-8"
          style={{
            fontFamily: designTokens?.typography?.fontFamily,
            fontWeight: designTokens?.typography?.weights?.regular,
            lineHeight: designTokens?.typography?.lineHeights?.body,
          }}
        >
          “{text}”
        </blockquote>

        <div>
          <cite
            className="text-lg md:text-xl text-black font-bold not-italic block"
            style={{
              fontFamily: designTokens?.typography?.fontFamily,
              fontWeight: designTokens?.typography?.weights?.bold,
            }}
          >
            {client}
          </cite>
          {role && (
            <p
              className="text-gray-500 text-sm md:text-base mt-1"
              style={{
                fontFamily: designTokens?.typography?.fontFamily,
                fontWeight: designTokens?.typography?.weights?.regular,
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