import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../styles/tokens';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Portfolio', path: '/portfolio' },
    { label: 'Blog', path: '/blog' },
    { label: 'Story', path: '/story' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[60] bg-white/80 backdrop-blur-md"
      style={{
        height: '80px',
        borderBottom: `1px solid ${designTokens.colors.shadow}`,
        fontFamily: designTokens.typography.fontFamily,
      }}
    >
      <div 
        className="mx-auto px-6 h-full flex items-center justify-between"
        style={{ maxWidth: designTokens.spacing.layout.maxWidth }}
      >
        {/* Brand Identity */}
        <Link
          to="/"
          className="group flex flex-col leading-tight"
          aria-label="Home"
        >
          <span
            className="text-lg uppercase tracking-[0.2em] transition-colors duration-300 group-hover:text-black"
            style={{
              fontWeight: designTokens.typography.weights.bold,
              color: designTokens.colors.textPrimary,
              fontSize: designTokens.typography.sizes.xs,
            }}
          >
            Alexandru
          </span>
          <span
            className="text-lg uppercase tracking-[0.2em] transition-colors duration-300 group-hover:opacity-60"
            style={{
              fontWeight: designTokens.typography.weights.light,
              color: designTokens.colors.textSecondary,
              fontSize: designTokens.typography.sizes.xs,
            }}
          >
            Grigore
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className="relative px-5 py-2 transition-colors duration-300"
                style={{
                  fontSize: designTokens.typography.sizes.xs,
                  fontWeight: designTokens.typography.weights.medium,
                  letterSpacing: designTokens.typography.letterSpacings.wide,
                  color: active ? designTokens.colors.textPrimary : designTokens.colors.textSecondary,
                }}
              >
                {/* Visual Active Indicator (No Layout Shift) */}
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full z-[-1]"
                    style={{ backgroundColor: designTokens.colors.shadow }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <span className="relative z-10">{link.label}</span>
                
                {/* Subtle Hover Underline */}
                {!active && (
                  <motion.div 
                    className="absolute bottom-1 left-5 right-5 h-[1px] bg-black origin-left"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 rounded-full transition-colors active:scale-95"
          style={{ backgroundColor: isMenuOpen ? designTokens.colors.shadow : 'transparent' }}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[80px] left-0 right-0 bg-white border-b shadow-xl md:hidden overflow-hidden"
            style={{ borderColor: designTokens.colors.shadow }}
          >
            <nav className="flex flex-col p-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-6 py-4 rounded-xl transition-all"
                  style={{
                    fontSize: designTokens.typography.sizes.sm,
                    fontWeight: designTokens.typography.weights.medium,
                    color: isActive(link.path) ? designTokens.colors.textPrimary : designTokens.colors.textSecondary,
                    backgroundColor: isActive(link.path) ? designTokens.colors.shadow : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;