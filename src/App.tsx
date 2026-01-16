import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import UnderConstructionPage from './pages/UnderConstructionPage';
import PortfolioPage from './pages/PortfolioPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { PortfolioManagementPage } from './pages/admin/PortfolioManagementPage';
import { BlogManagementPage } from './pages/admin/BlogManagementPage';
import { BlogCreateForm } from './pages/admin/create/BlogCreateForm';
import { ProtectedRoute } from './components/ProtectedRoute';
import PublicLayout from './components/PublicLayout';

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
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><UnderConstructionPage /></PublicLayout>} />
        <Route path="/portfolio" element={<PublicLayout><PortfolioPage /></PublicLayout>} />
        <Route path="/portfolio/:clientSlug/:projectSlug" element={<PublicLayout><ProjectDetailPage /></PublicLayout>} />
        <Route path="/blog" element={<PublicLayout><BlogListPage /></PublicLayout>} />
        <Route path="/blog/:slug" element={<PublicLayout><BlogPostPage /></PublicLayout>} />

        <Route path="/what-i-do/video-production/" element={<Navigate to="/portfolio" replace />} />
        <Route path="/what-i-do/video-production/:clientSlug/:projectSlug" element={<Navigate to="/portfolio" replace />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/portfolio"
          element={
            <ProtectedRoute>
              <PortfolioManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/blog"
          element={
            <ProtectedRoute>
              <BlogManagementPage />
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