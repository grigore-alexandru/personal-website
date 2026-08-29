'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { designTokens } from '../styles/tokens';

interface ProjectHeroProps {
  bgUrl: string;
  title: string;
  type: string;
  client: string;
  date: string;
}

const ProjectHero: React.FC<ProjectHeroProps> = ({ bgUrl, title, type, client, date }) => {
  const [scrollY, setScrollY] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background image — rendered directly with `priority` instead of being
          fetched via a client-side `new Image()` in a useEffect. `priority`
          makes Next.js emit a <link rel="preload"> in the server-rendered HTML,
          so the browser's preloader can start fetching this (the page's LCP
          element) immediately, instead of waiting for JS to hydrate first. */}
      <Image
        src={bgUrl}
        alt=""
        fill
        priority
        sizes="100vw"
        quality={85}
        className={`object-cover transition-opacity duration-500 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: `translateY(${scrollY * 0.5}px) scale(1.1)` }}
        onLoad={() => setImageLoaded(true)}
      />

      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

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
