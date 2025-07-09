import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { designTokens } from '../styles/tokens';

interface HeaderProps {
  onFilterToggle?: () => void;
  showFilter?: boolean;
  projectTitle?: string;
}

const Header: React.FC<HeaderProps> = ({ onFilterToggle, showFilter = true, projectTitle }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isHomePage = location.pathname === '/what-i-do/video-production/';
  const isProjectPage = location.pathname.includes('/what-i-do/video-production/') && !isHomePage;

  // Determine the title to display
  const getTitle = () => {
    if (isProjectPage && projectTitle) {
      return projectTitle;
    }
    return 'Video Production';
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm"
      style={{ 
        height: '80px',
        borderBottom: `1px solid ${designTokens.colors.shadow}`,
      }}
    >
      <div className="max-w-screen-xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Left Side - Back Arrow for Project Pages or Mobile Menu */}
        <div className="flex items-center">
          {isProjectPage ? (
            <Link
              to="/what-i-do/video-production/"
              className="p-2 focus:outline-none focus:ring-2 focus:ring-black rounded hover:bg-gray-100 transition-colors"
              aria-label="Back to portfolio"
            >
              <ArrowLeft size={24} />
            </Link>
          ) : (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 focus:outline-none focus:ring-2 focus:ring-black"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        {/* Center - Dynamic Title */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <h1 
            className="font-bold text-xl tracking-wide text-center"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              letterSpacing: designTokens.typography.letterSpacings.wide,
            }}
          >
            {getTitle()}
          </h1>
        </div>

        {/* Right Side - Spacer to maintain centering */}
        <div className="w-10" />
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && !isProjectPage && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <nav className="px-6 py-4">
            <Link
              to="/what-i-do/video-production/"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-sm font-medium hover:text-gray-600 transition-colors"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
                letterSpacing: designTokens.typography.letterSpacings.wide,
              }}
            >
              HOME
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;