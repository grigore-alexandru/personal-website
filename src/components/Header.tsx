import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { designTokens } from '../styles/tokens';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Portfolio', path: '/portfolio' },
    { label: 'Blog', path: '/blog' },
    { label: 'About', path: '/about' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
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
        {/* Left - Brand Name */}
        <Link
          to="/"
          className="flex flex-col leading-tight hover:opacity-80 transition-opacity"
        >
          <span
            className="text-lg font-bold tracking-wide"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              letterSpacing: designTokens.typography.letterSpacings.wide,
            }}
          >
            Silviu-Alexandru
          </span>
          <span
            className="text-lg font-bold tracking-wide"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              letterSpacing: designTokens.typography.letterSpacings.wide,
            }}
          >
            Grigore
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative px-4 py-2 rounded-md transition-all duration-200 ${
                isActive(link.path)
                  ? 'font-bold bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 shadow-sm'
                  : 'font-medium hover:bg-gray-50'
              }`}
              style={{
                fontFamily: designTokens.typography.fontFamily,
                letterSpacing: designTokens.typography.letterSpacings.wide,
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 focus:outline-none focus:ring-2 focus:ring-black rounded"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <nav className="px-6 py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive(link.path)
                    ? 'font-bold bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 shadow-sm'
                    : 'font-medium hover:bg-gray-50'
                }`}
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  letterSpacing: designTokens.typography.letterSpacings.wide,
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
