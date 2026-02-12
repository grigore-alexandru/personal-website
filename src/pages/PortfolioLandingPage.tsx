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
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      navigate(path);
      return;
    }
    setIsExiting(true);
    setExitingPanel(panel);

    // Timing matches the CSS transition for a seamless jump
    setTimeout(() => {
      navigate(path);
    }, 600);
  };

  const getGridTemplate = () => {
    if (isExiting) {
      // Aggressive collapse: The non-selected side vanishes entirely
      return exitingPanel === 'left' ? '1fr 1fr 0fr 0fr' : '0fr 0fr 1fr 1fr';
    }
    if (hoveredPanel === 'left') return '1.06fr 1.06fr 0.94fr 0.94fr';
    if (hoveredPanel === 'right') return '0.94fr 0.94fr 1.06fr 1.06fr';
    return '1fr 1fr 1fr 1fr';
  };

  // Helper to determine media scale
  const getMediaTransform = (panel: 'left' | 'right') => {
    if (isExiting && exitingPanel === panel) return 'scale(1.25)'; // Deep zoom on click
    if (hoveredPanel === panel) return 'scale(1.05)'; // Gentle zoom on hover
    return 'scale(1)';
  };

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      <div
        className="grid gap-4 p-4 h-full md:gap-6 md:p-6"
        style={{
          gridTemplateColumns: isMobile ? '1fr' : getGridTemplate(),
          gridTemplateRows: isMobile ? '1fr 1fr' : '1fr',
          transition: 'grid-template-columns 0.7s cubic-bezier(0.7, 0, 0.3, 1)',
        }}
      >
        {/* Left Panel */}
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
              backgroundImage: `url('https://lqbyvubbzexujviflunv.supabase.co/storage/v1/object/sign/website-media/PORTFOLIO_PROJECTS_IMAGE.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNTIzNTU4Yi1iZjk0LTRiMTItYmQ1Yy1kOGM4MzExZDQ5ZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlLW1lZGlhL1BPUlRGT0xJT19QUk9KRUNUU19JTUFHRS5qcGVnIiwiaWF0IjoxNzcwOTIyNjQzLCJleHAiOjE4MDI0NTg2NDN9.aOODZRS-dsK1i_55i-6Ailz2NiuOQSCP0YIR3-zreQA')`,
              filter: hoveredPanel === 'left' ? 'saturate(1) brightness(0.8)' : 'saturate(0.3) brightness(0.6)',
              transform: getMediaTransform('left'),
              transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />
          
          {/* Content Overlay */}
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-500"
            style={{
              opacity: isExiting ? 0 : 1,
              transform: isExiting ? 'translateY(-40px)' : 'translateY(0)',
            }}
          >
            <h2 className="text-white mb-6 tracking-wide" style={{ fontFamily: designTokens.typography.fontFamily, fontSize: isMobile ? '3rem' : '4rem', fontWeight: 700 }}>
              Projects
            </h2>
            <button className="px-8 py-3 bg-white text-black rounded-full transition-transform active:scale-90 hover:scale-105">
              Explore
            </button>
          </div>
        </div>

        {/* Right Panel */}
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
              filter: hoveredPanel === 'right' ? 'saturate(1.1) brightness(0.8)' : 'saturate(0.3) brightness(0.6)',
              opacity: hoveredPanel === 'right' ? 1 : 0.4,
              transform: getMediaTransform('right'),
              transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            src="https://lqbyvubbzexujviflunv.supabase.co/storage/v1/object/sign/website-media/PORTFOLIO_MEDIA_VIDEO.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNTIzNTU4Yi1iZjk0LTRiMTItYmQ1Yy1kOGM4MzExZDQ5ZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlLW1lZGlhL1BPUlRGT0xJT19NRURJQV9WSURFTy5tcDQiLCJpYXQiOjE3NzA5MjI2MzAsImV4cCI6MTgwMjQ1ODYzMH0.Z2kP5B44DyVjS23XQO5TJfijAQyAFBYNGglbpN3jZAc"
            muted loop playsInline preload="auto"
          />

          <div 
            className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-500"
            style={{
              opacity: isExiting ? 0 : 1,
              transform: isExiting ? 'translateY(-40px)' : 'translateY(0)',
            }}
          >
            <h2 className="text-white mb-6 tracking-wide" style={{ fontFamily: designTokens.typography.fontFamily, fontSize: isMobile ? '3rem' : '4rem', fontWeight: 700 }}>
              Media
            </h2>
            <button className="px-8 py-3 bg-white text-black rounded-full transition-transform active:scale-90 hover:scale-105">
              Experience
            </button>
          </div>
        </div>
      </div>

      {/* Optional: Flash Overlay for a tactile feel on click */}
      {isExiting && (
        <div className="absolute inset-0 pointer-events-none animate-flash bg-white z-50" style={{ opacity: 0 }} />
      )}
    </div>
  );
};

export default PortfolioLandingPage;