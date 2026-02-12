import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import UnderConstructionPage from './pages/UnderConstructionPage';
import PortfolioPage from './pages/PortfolioPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import { ContentPortfolioPage } from './pages/ContentPortfolioPage';
import { ContentDetailPage } from './pages/ContentDetailPage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { PortfolioManagementPage } from './pages/admin/PortfolioManagementPage';
import { BlogManagementPage } from './pages/admin/BlogManagementPage';
import { ContentManagementPage } from './pages/admin/ContentManagementPage';
import { BlogCreateForm } from './pages/admin/create/BlogCreateForm';
import { ProjectCreateForm } from './pages/admin/create/ProjectCreateForm';
import { ContentCreateForm } from './pages/admin/create/ContentCreateForm';
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
        <Route path="/portfolio/project/:slug" element={<PublicLayout><ProjectDetailPage /></PublicLayout>} />
        <Route path="/portfolio/content" element={<PublicLayout><ContentPortfolioPage /></PublicLayout>} />
        <Route path="/portfolio/content/:slug" element={<PublicLayout><ContentDetailPage /></PublicLayout>} />
        <Route path="/blog" element={<PublicLayout><BlogListPage /></PublicLayout>} />
        <Route path="/blog/:slug" element={<PublicLayout><BlogPostPage /></PublicLayout>} />

        <Route path="/what-i-do/video-production/" element={<Navigate to="/portfolio" replace />} />
        <Route path="/what-i-do/video-production/:clientSlug/:projectSlug" element={<Navigate to="/portfolio" replace />} />
        <Route path="/portfolio/:clientSlug/:projectSlug" element={<Navigate to="/portfolio" replace />} />

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
          path="/admin/portfolio/project/create"
          element={
            <ProtectedRoute>
              <ProjectCreateForm mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/portfolio/project/edit/:projectId"
          element={
            <ProtectedRoute>
              <ProjectCreateForm mode="edit" />
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
              <BlogCreateForm mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/blog/edit/:postId"
          element={
            <ProtectedRoute>
              <BlogCreateForm mode="edit" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/blog/republish/:postId"
          element={
            <ProtectedRoute>
              <BlogCreateForm mode="republish" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/content"
          element={
            <ProtectedRoute>
              <ContentManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/content/create"
          element={
            <ProtectedRoute>
              <ContentCreateForm mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/content/edit/:contentId"
          element={
            <ProtectedRoute>
              <ContentCreateForm mode="edit" />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;