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

    setTimeout(() => {
      navigate(path);
    }, 700); // Slightly longer to allow the aggressive zoom to "travel"
  };

  const getGridTemplate = () => {
    if (isExiting) {
      return exitingPanel === 'left' ? '1fr 1fr 0fr 0fr' : '0fr 0fr 1fr 1fr';
    }
    if (hoveredPanel === 'left') return '1.06fr 1.06fr 0.94fr 0.94fr';
    if (hoveredPanel === 'right') return '0.94fr 0.94fr 1.06fr 1.06fr';
    return '1fr 1fr 1fr 1fr';
  };

  // Aggressive Zoom and Brightness Flash logic
  const getMediaStyle = (panel: 'left' | 'right') => {
    const isThisPanelHovered = hoveredPanel === panel;
    const isOtherPanelHovered = hoveredPanel !== null && hoveredPanel !== panel;
    const isThisPanelExiting = exitingPanel === panel;

    let filter = 'saturate(0.3) brightness(0.5)';
    let transform = 'scale(1)';
    let opacity = 1;

    if (isThisPanelHovered) {
      filter = 'saturate(1) brightness(0.9)';
      transform = 'scale(1.06)';
    }

    if (isOtherPanelHovered) {
      filter = 'saturate(0.1) brightness(0.2)'; // Intense darkening when the other is hovered
      transform = 'scale(0.98)'; // Slight inward shrink for contrast
    }

    if (isExiting) {
      if (isThisPanelExiting) {
        filter = 'saturate(1.5) brightness(1.5)'; // Exposure flare
        transform = 'scale(1.8)'; // Aggressive zoom
      } else {
        filter = 'brightness(0)'; // Snap non-selected to black
        opacity = 0;
      }
    }

    return {
      filter,
      transform,
      opacity,
      transition: isExiting 
        ? 'all 0.8s cubic-bezier(0.6, 0.05, 0.01, 0.9)' 
        : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  return (
    <div className="relative w-full overflow-hidden bg-black" style={{ height: 'calc(100vh - 80px)' }}>
      <div
        className="grid gap-4 p-4 h-full md:gap-6 md:p-6"
        style={{
          gridTemplateColumns: isMobile ? '1fr' : getGridTemplate(),
          gridTemplateRows: isMobile ? '1fr 1fr' : '1fr',
          transition: 'grid-template-columns 0.7s cubic-bezier(0.7, 0, 0.3, 1)',
        }}
      >
        {/* Left Panel - Projects */}
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer"
          style={{
            gridColumn: isMobile ? 'span 1' : 'span 2',
            zIndex: exitingPanel === 'left' ? 20 : 1,
          }}
          onMouseEnter={() => !isMobile && setHoveredPanel('left')}
          onMouseLeave={() => !isMobile && setHoveredPanel(null)}
          onClick={() => handleNavigate('/portfolio/projects', 'left')}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://lqbyvubbzexujviflunv.supabase.co/storage/v1/object/sign/website-media/PORTFOLIO_PROJECTS_IMAGE.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNTIzNTU4Yi1iZjk0LTRiMTItYmQ1Yy1kOGM4MzExZDQ5ZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlLW1lZGlhL1BPUlRGT0xJT19QUk9KRUNUU19JTUFHRS5qcGVnIiwiaWF0IjoxNzcwOTIyNjQzLCJleHAiOjE4MDI0NTg2NDN9.aOODZRS-dsK1i_55i-6Ailz2NiuOQSCP0YIR3-zreQA')`,
              ...getMediaStyle('left')
            }}
          />
          
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-300"
            style={{ 
              opacity: isExiting ? 0 : 1,
              transform: isExiting ? 'scale(0.9) translateY(20px)' : 'scale(1)',
            }}
          >
            <h2 className="text-white mb-6 tracking-wide" style={{ fontFamily: designTokens.typography.fontFamily, fontSize: isMobile ? '3rem' : '4rem', fontWeight: 700 }}>
              Projects
            </h2>
            <button className="px-8 py-3 bg-white text-black rounded-full font-semibold">
              Explore
            </button>
          </div>
        </div>

        {/* Right Panel - Media */}
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer"
          style={{
            gridColumn: isMobile ? 'span 1' : 'span 2',
            zIndex: exitingPanel === 'right' ? 20 : 1,
          }}
          onMouseEnter={() => !isMobile && setHoveredPanel('right')}
          onMouseLeave={() => !isMobile && setHoveredPanel(null)}
          onClick={() => handleNavigate('/portfolio/content', 'right')}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: (hoveredPanel === 'right' || isExiting) ? 1 : 0.5,
              ...getMediaStyle('right')
            }}
            src="https://lqbyvubbzexujviflunv.supabase.co/storage/v1/object/sign/website-media/PORTFOLIO_MEDIA_VIDEO.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNTIzNTU4Yi1iZjk0LTRiMTItYmQ1Yy1kOGM4MzExZDQ5ZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlLW1lZGlhL1BPUlRGT0xJT19NRURJQV9WSURFTy5tcDQiLCJpYXQiOjE3NzA5MjI2MzAsImV4cCI6MTgwMjQ1ODYzMH0.Z2kP5B44DyVjS23XQO5TJfijAQyAFBYNGglbpN3jZAc"
            muted loop playsInline preload="auto"
          />

          <div 
            className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-300"
            style={{ 
              opacity: isExiting ? 0 : 1,
              transform: isExiting ? 'scale(0.9) translateY(20px)' : 'scale(1)',
            }}
          >
            <h2 className="text-white mb-6 tracking-wide" style={{ fontFamily: designTokens.typography.fontFamily, fontSize: isMobile ? '3rem' : '4rem', fontWeight: 700 }}>
              Media
            </h2>
            <button className="px-8 py-3 bg-white text-black rounded-full font-semibold">
              Experience
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioLandingPage;