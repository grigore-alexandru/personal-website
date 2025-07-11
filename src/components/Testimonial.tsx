import React from 'react';
import { Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import { designTokens } from '../styles/tokens';

interface TestimonialProps {
  client: string;
  text: string;
  role?: string;
}

const Testimonial: React.FC<TestimonialProps> = ({ client, text, role }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="relative bg-transparent rounded-2xl px-8 py-12 md:px-12 md:py-16 overflow-hidden text-center"
    >
      {/* Decorative Quote Icon */}
      <Quote
        size={140}
        className="absolute top-4 left-4 text-gray-100 opacity-30 pointer-events-none"
        style={{
          transform: 'rotate(180deg)',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        <blockquote
          className="text-2xl md:text-3xl leading-relaxed text-gray-800 italic mb-8"
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
            className="text-xl md:text-2xl text-black font-bold not-italic block"
            style={{
              fontFamily: designTokens?.typography?.fontFamily,
              fontWeight: designTokens?.typography?.weights?.bold,
            }}
          >
            {client}
          </cite>
          {role && (
            <p
              className="text-gray-500 text-base md:text-lg mt-1"
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
    </motion.div>
  );
};

export default Testimonial;