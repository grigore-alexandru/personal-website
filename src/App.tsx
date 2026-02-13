import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import PublicLayout from './components/PublicLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const UnderConstructionPage = lazy(() => import('./pages/UnderConstructionPage'));
const PortfolioLandingPage = lazy(() => import('./pages/PortfolioLandingPage'));
const ProjectsListPage = lazy(() => import('./pages/ProjectsListPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ContentPortfolioPage = lazy(() => import('./pages/ContentPortfolioPage').then(module => ({ default: module.ContentPortfolioPage })));
const ContentDetailPage = lazy(() => import('./pages/ContentDetailPage').then(module => ({ default: module.ContentDetailPage })));
const BlogListPage = lazy(() => import('./pages/BlogListPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(module => ({ default: module.AdminDashboardPage })));
const PortfolioManagementPage = lazy(() => import('./pages/admin/PortfolioManagementPage').then(module => ({ default: module.PortfolioManagementPage })));
const BlogManagementPage = lazy(() => import('./pages/admin/BlogManagementPage').then(module => ({ default: module.BlogManagementPage })));
const ContentManagementPage = lazy(() => import('./pages/admin/ContentManagementPage').then(module => ({ default: module.ContentManagementPage })));
const BlogCreateForm = lazy(() => import('./pages/admin/create/BlogCreateForm').then(module => ({ default: module.BlogCreateForm })));
const ProjectCreateForm = lazy(() => import('./pages/admin/create/ProjectCreateForm').then(module => ({ default: module.ProjectCreateForm })));
const ContentCreateForm = lazy(() => import('./pages/admin/create/ContentCreateForm').then(module => ({ default: module.ContentCreateForm })));
const MediaCompressorPage = lazy(() => import('./pages/admin/MediaCompressorPage'));

const PageLoader = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
  </div>
);

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><UnderConstructionPage /></PublicLayout>} />
        <Route path="/portfolio" element={<PublicLayout><PortfolioLandingPage /></PublicLayout>} />
        <Route path="/portfolio/projects" element={<PublicLayout><ProjectsListPage /></PublicLayout>} />
        <Route path="/portfolio/project/:slug" element={<PublicLayout><ProjectDetailPage /></PublicLayout>} />
        <Route path="/portfolio/content" element={<PublicLayout><ContentPortfolioPage /></PublicLayout>} />
        <Route path="/portfolio/content/:slug" element={<PublicLayout><ContentDetailPage /></PublicLayout>} />
        <Route path="/blog" element={<PublicLayout><BlogListPage /></PublicLayout>} />
        <Route path="/blog/:slug" element={<PublicLayout><BlogPostPage /></PublicLayout>} />

        <Route path="/what-i-do/video-production/" element={<Navigate to="/portfolio/projects" replace />} />
        <Route path="/what-i-do/video-production/:clientSlug/:projectSlug" element={<Navigate to="/portfolio/projects" replace />} />
        <Route path="/portfolio/:clientSlug/:projectSlug" element={<Navigate to="/portfolio/projects" replace />} />

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
        <Route
          path="/admin/compressor"
          element={
            <ProtectedRoute>
              <MediaCompressorPage />
            </ProtectedRoute>
          }
        />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;