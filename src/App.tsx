import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PortfolioPage from './pages/PortfolioPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import BlogPostPage from './pages/BlogPostPage';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

// Initialize dataLayer for analytics
if (typeof window !== 'undefined' && !window.dataLayer) {
  window.dataLayer = [];
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/what-i-do/video-production/" replace />} />
        <Route path="/what-i-do/video-production/" element={<PortfolioPage />} />
        <Route path="/what-i-do/video-production/:clientSlug/:projectSlug" element={<ProjectDetailPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Routes>
    </Router>
  );
}

export default App;