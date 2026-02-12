import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { designTokens } from '../styles/tokens';

type HoveredPanel = 'left' | 'right' | null;

const PortfolioLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredPanel, setHoveredPanel] = useState<HoveredPanel>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [exitingPanel, setExitingPanel] = useState<'left' | 'right' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (videoRef.current && hoveredPanel === 'right' && !isMobile) {
      videoRef.current.play().catch((error) => {
        console.error('Video play failed:', error);
      });
    } else if (videoRef.current && hoveredPanel !== 'right') {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [hoveredPanel, isMobile]);

  const handleNavigate = (path: string, panel: 'left' | 'right') => {
    if (isMobile) {
      navigate(path);
      return;
    }

    setIsExiting(true);
    setExitingPanel(panel);

    setTimeout(() => {
      navigate(path);
    }, 400);
  };

  const getGridTemplate = () => {
    if (isExiting) {
      return exitingPanel === 'left' ? '1fr 1fr 0fr 0fr' : '0fr 0fr 1fr 1fr';
    }
    // Reduced the variance from 0.15/0.9 to 0.02 for a 10% feel of the original movement
    if (hoveredPanel === 'left') {
      return '1.02fr 1.02fr 0.98fr 0.98fr';
    }
    if (hoveredPanel === 'right') {
      return '0.98fr 0.98fr 1.02fr 1.02fr';
    }
    return '1fr 1fr 1fr 1fr';
  };

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      <div
        className="grid gap-4 p-4 h-full md:gap-6 md:p-6"
        style={{
          gridTemplateColumns: isMobile ? '1fr' : getGridTemplate(),
          gridTemplateRows: isMobile ? '1fr 1fr' : '1fr',
          transition: 'grid-template-columns 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Left Panel - Projects */}
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer"
          style={{
            // Locked to span 2 to prevent the large layout jump
            gridColumn: isMobile ? 'span 1' : 'span 2',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={() => !isMobile && setHoveredPanel('left')}
          onMouseLeave={() => !isMobile && setHoveredPanel(null)}
          onClick={() => handleNavigate('/portfolio/projects', 'left')}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://lqbyvubbzexujviflunv.supabase.co/storage/v1/object/sign/website-media/PORTFOLIO_PROJECTS_IMAGE.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNTIzNTU4Yi1iZjk0LTRiMTItYmQ1Yy1kOGM4MzExZDQ5ZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlLW1lZGlhL1BPUlRGT0xJT19QUk9KRUNUU19JTUFHRS5qcGVnIiwiaWF0IjoxNzcwOTIyNjQzLCJleHAiOjE4MDI0NTg2NDN9.aOODZRS-dsK1i_55i-6Ailz2NiuOQSCP0YIR3-zreQA')`,
              filter: hoveredPanel === 'left' ? 'saturate(1)' : 'saturate(0.3)',
              transition: 'filter 0.5s ease',
            }}
          />

          <div className="absolute inset-0 bg-black bg-opacity-20" />

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h2
              className="text-white mb-6 tracking-wide"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: isMobile ? '3rem' : '4rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              Projects
            </h2>
            <button
              className="px-8 py-3 bg-white text-black rounded-full hover:bg-opacity-90 transition-all duration-300 transform hover:scale-105"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.base,
                fontWeight: 600,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate('/portfolio/projects', 'left');
              }}
            >
              Explore
            </button>
          </div>
        </div>

        {/* Right Panel - Media */}
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer"
          style={{
            // Locked to span 2 to prevent the large layout jump
            gridColumn: isMobile ? 'span 1' : 'span 2',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={() => !isMobile && setHoveredPanel('right')}
          onMouseLeave={() => !isMobile && setHoveredPanel(null)}
          onClick={() => handleNavigate('/portfolio/content', 'right')}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://lqbyvubbzexujviflunv.supabase.co/storage/v1/object/sign/website-media/PORTFOLIO_MEDIA_IMAGE_2.1.1.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNTIzNTU4Yi1iZjk0LTRiMTItYmQ1Yy1kOGM4MzExZDQ5ZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlLW1lZGlhL1BPUlRGT0xJT19NRURJQV9JTUFHRV8yLjEuMS5qcGciLCJpYXQiOjE3NzA5MjI1OTMsImV4cCI6MTgzMzk5NDU5M30.kdwHBmdS5npljIVlfYtC_4rOSogjwl7MXAIwZeCk8aE')`,
              filter: hoveredPanel === 'right' ? 'saturate(1.1)' : 'saturate(0.3)',
              transition: 'filter 0.5s ease',
              opacity: hoveredPanel === 'right' ? 0 : 1,
            }}
          />

          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: hoveredPanel === 'right' ? 'saturate(1.1)' : 'saturate(0.3)',
              transition: 'filter 0.5s ease',
              opacity: hoveredPanel === 'right' ? 1 : 0,
            }}
            src="https://lqbyvubbzexujviflunv.supabase.co/storage/v1/object/sign/website-media/PORTFOLIO_MEDIA_VIDEO.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNTIzNTU4Yi1iZjk0LTRiMTItYmQ1Yy1kOGM4MzExZDQ5ZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlLW1lZGlhL1BPUlRGT0xJT19NRURJQV9WSURFTy5tcDQiLCJpYXQiOjE3NzA5MjI2MzAsImV4cCI6MTgwMjQ1ODYzMH0.Z2kP5B44DyVjS23XQO5TJfijAQyAFBYNGglbpN3jZAc"
            muted
            loop
            playsInline
            preload="auto"
          />

          <div className="absolute inset-0 bg-black bg-opacity-20" />

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h2
              className="text-white mb-6 tracking-wide"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: isMobile ? '3rem' : '4rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              Media
            </h2>
            <button
              className="px-8 py-3 bg-white text-black rounded-full hover:bg-opacity-90 transition-all duration-300 transform hover:scale-105"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.base,
                fontWeight: 600,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate('/portfolio/content', 'right');
              }}
            >
              Experience
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioLandingPage;