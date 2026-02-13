import React, { useEffect, useState } from 'react';
import { designTokens } from '../styles/tokens';
import MetaTriplet from './MetaTriplet';

interface ProjectHeroProps {
  bgUrl: string;
  title: string;
  type: string;
  client: string;
  date: string;
}

const ProjectHero: React.FC<ProjectHeroProps> = ({ bgUrl, title, type, client, date }) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Parallax Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url("${bgUrl}")`,
          transform: `translateY(${scrollY * 0.5}px)`,
          scale: '1.1',
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center text-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full">
          <h1 
            className="text-white font-bold mb-6 sm:mb-8 animate-fade-in-up text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          
          {/* Project Meta Details */}
          <div className="animate-fade-in-up px-4" style={{ animationDelay: '0.2s' }}>
            <div className="inline-flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-6 px-4 sm:px-6 py-3 sm:py-4 bg-black/30 backdrop-blur-sm rounded-2xl sm:rounded-full border border-white/20 max-w-full">
              <span 
                className="uppercase font-medium text-white/90 text-xs sm:text-sm whitespace-nowrap"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.regular,
                  letterSpacing: designTokens.typography.letterSpacings.wide,
                }}
              >
                {type}
              </span>
              
              <span className="text-white/40 hidden sm:inline">•</span>
              
              <span 
                className="uppercase font-medium text-white/90 text-xs sm:text-sm whitespace-nowrap"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.regular,
                  letterSpacing: designTokens.typography.letterSpacings.wide,
                }}
              >
                {client}
              </span>
              
              <span className="text-white/40 hidden sm:inline">•</span>
              
              <span 
                className="uppercase font-medium text-white/90 text-xs sm:text-sm whitespace-nowrap"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.regular,
                  letterSpacing: designTokens.typography.letterSpacings.wide,
                }}
              >
                {new Date(date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectHero;