'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { designTokens } from '../../styles/tokens';
import { Button } from '../../components/forms/Button';

const PROJECTS_IMAGE_URL = 'https://lqbyvubbzexujviflunv.supabase.co/storage/v1/object/sign/website-media/PORTFOLIO_PROJECTS_IMAGE.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNTIzNTU4Yi1iZjk0LTRiMTItYmQ1Yy1kOGM4MzExZDQ5ZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlLW1lZGlhL1BPUlRGT0xJT19QUk9KRUNUU19JTUFHRS53ZWJwIiwiaWF0IjoxNzczMTQ0OTY1LCJleHAiOjIwODg1MDQ5NjV9.s2u49_vZot36JvNJZsOnrouC791RdMpj3gzjOyQ3zYE';
const MEDIA_VIDEO_URL = 'https://lqbyvubbzexujviflunv.supabase.co/storage/v1/object/sign/website-media/PORTFOLIO_MEDIA_VIDEO.webm?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNTIzNTU4Yi1iZjk0LTRiMTItYmQ1Yy1kOGM4MzExZDQ5ZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlLW1lZGlhL1BPUlRGT0xJT19NRURJQV9WSURFTy53ZWJtIiwiaWF0IjoxNzczMTQ1MDM1LCJleHAiOjIwODg1MDUwMzV9.7DOmN85zsUG3qC7oVAhLAt1Gj9ss3mkWFTUoOyPl2C8';

type HoveredPanel = 'left' | 'right' | null;

const PortfolioLandingContent: React.FC = () => {
  const router = useRouter();
  const [hoveredPanel, setHoveredPanel] = useState<HoveredPanel>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [exitingPanel, setExitingPanel] = useState<'left' | 'right' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const projectImage = new Image();
    projectImage.src = PROJECTS_IMAGE_URL;
    projectImage.onload = () => setImageLoaded(true);

    const video = document.createElement('video');
    video.src = MEDIA_VIDEO_URL;
    video.preload = 'auto';
    video.onloadeddata = () => setVideoLoaded(true);
  }, []);

  useEffect(() => {
    if (imageLoaded && videoLoaded) {
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [imageLoaded, videoLoaded]);

  useEffect(() => {
    if (videoRef.current && hoveredPanel === 'right' && !isMobile) {
      videoRef.current.play().catch((error) => console.error('Video play failed:', error));
    } else if (videoRef.current && hoveredPanel !== 'right') {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [hoveredPanel, isMobile]);

  const handleNavigate = (path: string, panel: 'left' | 'right') => {
    if (isMobile) {
      router.push(path);
      return;
    }
    setIsExiting(true);
    setExitingPanel(panel);

    setTimeout(() => {
      router.push(path);
    }, 600);
  };

  const getGridTemplate = () => {
    if (isExiting) {
      return exitingPanel === 'left' ? '1fr 1fr 0fr 0fr' : '0fr 0fr 1fr 1fr';
    }
    if (hoveredPanel === 'left') return '1.06fr 1.06fr 0.94fr 0.94fr';
    if (hoveredPanel === 'right') return '0.94fr 0.94fr 1.06fr 1.06fr';
    return '1fr 1fr 1fr 1fr';
  };

  const getMediaTransform = (panel: 'left' | 'right') => {
    if (isExiting && exitingPanel === panel) return 'scale(1.25)';
    if (hoveredPanel === panel) return 'scale(1.05)';
    return 'scale(1)';
  };

  if (isLoading) {
    return (
      <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
        <div
          className="grid gap-4 p-4 h-full md:gap-6 md:p-6"
          style={{
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr',
            gridTemplateRows: isMobile ? '1fr 1fr' : '1fr',
            opacity: 1,
            transition: 'opacity 0.3s ease-out',
          }}
        >
          <div
            className="relative rounded-2xl overflow-hidden bg-gray-200 animate-pulse"
            style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="bg-gray-300 rounded mb-4" style={{ width: isMobile ? '150px' : '200px', height: isMobile ? '50px' : '70px' }} />
              <div className="bg-gray-300 rounded-full" style={{ width: '120px', height: '45px' }} />
            </div>
          </div>

          <div
            className="relative rounded-2xl overflow-hidden bg-gray-200 animate-pulse"
            style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="bg-gray-300 rounded mb-4" style={{ width: isMobile ? '150px' : '200px', height: isMobile ? '50px' : '70px' }} />
              <div className="bg-gray-300 rounded-full" style={{ width: '120px', height: '45px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      <div
        className="grid gap-4 p-4 h-full md:gap-6 md:p-6 animate-fade-in"
        style={{
          gridTemplateColumns: isMobile ? '1fr' : getGridTemplate(),
          gridTemplateRows: isMobile ? '1fr 1fr' : '1fr',
          transition: 'grid-template-columns 0.7s cubic-bezier(0.7, 0, 0.3, 1)',
        }}
      >
        {/* Left Panel — Projects */}
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer"
          style={{
            gridColumn: isMobile ? 'span 1' : 'span 2',
            zIndex: exitingPanel === 'left' ? 10 : 1,
            transition: 'all 0.6s ease-in-out',
          }}
          onMouseEnter={() => !isMobile && setHoveredPanel('left')}
          onMouseLeave={() => !isMobile && setHoveredPanel(null)}
          onClick={() => handleNavigate('/portfolio/projects', 'left')}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${PROJECTS_IMAGE_URL}')`,
              filter: hoveredPanel === 'left' ? 'saturate(1) brightness(0.8)' : 'saturate(0.3) brightness(0.6)',
              transform: getMediaTransform('left'),
              transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />

          <div
            className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-500"
            style={{
              opacity: isExiting ? 0 : 1,
              transform: isExiting ? 'translateY(-40px)' : 'translateY(0)',
            }}
          >
            <h2
              className="text-white mb-6 tracking-wide"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: isMobile ? '3rem' : '4rem',
                fontWeight: 700,
              }}
            >
              Projects
            </h2>
            <Button variant="white" size="md">
              Explore
            </Button>
          </div>
        </div>

        {/* Right Panel — Media */}
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer"
          style={{
            gridColumn: isMobile ? 'span 1' : 'span 2',
            zIndex: exitingPanel === 'right' ? 10 : 1,
            transition: 'all 0.6s ease-in-out',
          }}
          onMouseEnter={() => !isMobile && setHoveredPanel('right')}
          onMouseLeave={() => !isMobile && setHoveredPanel(null)}
          onClick={() => handleNavigate('/portfolio/content', 'right')}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: hoveredPanel === 'right' ? 'saturate(1.1) brightness(1.1)' : 'saturate(0.3) brightness(0.6)',
              transform: getMediaTransform('right'),
              transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            src={MEDIA_VIDEO_URL}
            muted
            loop
            playsInline
            preload="metadata"
          />

          <div
            className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-500"
            style={{
              opacity: isExiting ? 0 : 1,
              transform: isExiting ? 'translateY(-40px)' : 'translateY(0)',
            }}
          >
            <h2
              className="text-white mb-6 tracking-wide"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: isMobile ? '3rem' : '4rem',
                fontWeight: 700,
              }}
            >
              Media
            </h2>
            <Button variant="white" size="md">
              Experience
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioLandingContent;
