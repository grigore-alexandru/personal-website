import React, { useEffect, useState } from 'react';
import { designTokens } from '../styles/tokens';

interface ProjectHeroProps {
  bgUrl: string;
  title: string;
}

const ProjectHero: React.FC<ProjectHeroProps> = ({ bgUrl, title }) => {
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
          backgroundImage: `url(${bgUrl})`,
          transform: `translateY(${scrollY * 0.5}px)`,
          scale: '1.1',
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
        <div className="max-w-4xl">
          <h1 
            className="text-white font-bold mb-4 animate-fade-in-up"
            style={{
              fontSize: designTokens.typography.sizes.xxl,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
        </div>
      </div>
    </section>
  );
};

export default ProjectHero;