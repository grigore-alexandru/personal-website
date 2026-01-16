import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PortfolioPage from './pages/PortfolioPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import { BlogCreateForm } from './pages/admin/create/BlogCreateForm';
import { ProtectedRoute } from './components/ProtectedRoute';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

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
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Navigate to="/admin/blog/create" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/blog/create"
          element={
            <ProtectedRoute>
              <BlogCreateForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/blog/edit/:id"
          element={
            <ProtectedRoute>
              <div className="min-h-screen flex items-center justify-center bg-white">
                <p className="text-lg text-neutral-600">Blog Edit Form (Coming in Future Phase)</p>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;