import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Film, Users } from 'lucide-react';
import SEO from '../components/SEO';
import { SITE_URL } from '../config/seo';
import { SearchBar } from '../components/ui/SearchBar';
import { Project, ProjectType } from '../types';
import { loadProjects, countProjects } from '../utils/dataLoader';
import { loadProjectTypes, loadAllClients } from '../utils/portfolioService';
import CustomDropdown from '../components/forms/CustomDropdown';
import ProjectGrid from '../components/project/ProjectGrid';
import { designTokens } from '../styles/tokens';
import { useUrlFilter, useClearUrlFilters } from '../hooks/useUrlFilters';

const BATCH_SIZE = 12;

const ProjectsListPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typeFilter, setTypeFilter] = useUrlFilter('type', 'all');
  const [clientFilter, setClientFilter] = useUrlFilter('client', 'all');
  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([
    { value: 'all', label: 'All Types' },
  ]);
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([
    { value: 'all', label: 'All Clients' },
  ]);
  const [hasMore, setHasMore] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [viewportImagesLoaded, setViewportImagesLoaded] = useState(false);
  const loadedCountRef = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsData, typesData, total, clients] = await Promise.all([
          loadProjects(BATCH_SIZE, 0),
          loadProjectTypes(),
          countProjects(),
          loadAllClients(),
        ]);

        setTotalProjects(total);
        setProjects(projectsData);
        setFilteredProjects(projectsData);
        setHasMore(projectsData.length < total);

        setTypeOptions([
          { value: 'all', label: 'All Types' },
          ...typesData.map((t: ProjectType) => ({
            value: t.slug,
            label: t.name,
          })),
        ]);
        setClientOptions([
          { value: 'all', label: 'All Clients' },
          ...clients.map(c => ({ value: c, label: c })),
        ]);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    countProjects().then(total => setTotalProjects(total));
    fetchData();
  }, []);

  const handleImageLoad = useCallback(() => {
    if (viewportImagesLoaded) return;
    loadedCountRef.current += 1;
    const target = filteredProjects.length > 0 ? filteredProjects.length : BATCH_SIZE;
    if (loadedCountRef.current >= target) {
      setViewportImagesLoaded(true);
    }
  }, [filteredProjects.length, viewportImagesLoaded]);

  const loadMoreProjects = useCallback(async () => {
    if (loadingMore || !hasMore || searchQuery.trim() || typeFilter !== 'all' || clientFilter !== 'all') return;

    setLoadingMore(true);
    setViewportImagesLoaded(false);
    loadedCountRef.current = 0;

    try {
      const newProjects = await loadProjects(BATCH_SIZE, projects.length);
      setProjects(prev => [...prev, ...newProjects]);
      setHasMore(projects.length + newProjects.length < totalProjects);
    } catch (error) {
      console.error('Error loading more projects:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [projects.length, hasMore, loadingMore, totalProjects, searchQuery, typeFilter, clientFilter]);

  useEffect(() => {
    if (!viewportImagesLoaded) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreProjects();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loadMoreProjects, viewportImagesLoaded]);

  useEffect(() => {
    let filtered = projects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(q) ||
        project.client_name.toLowerCase().includes(q) ||
        project.project_type.name.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(project =>
        project.project_type.slug === typeFilter
      );
    }

    if (clientFilter !== 'all') {
      filtered = filtered.filter(project =>
        project.client_name === clientFilter
      );
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, typeFilter, clientFilter]);

  useEffect(() => {
    loadedCountRef.current = 0;
    setViewportImagesLoaded(false);
  }, [searchQuery, typeFilter, clientFilter]);

  const clearFilters = useClearUrlFilters(['q', 'type', 'client']);

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all' || clientFilter !== 'all';

  const skeletonCount = totalProjects > 0
    ? Math.min(totalProjects, BATCH_SIZE)
    : BATCH_SIZE;

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Projects"
        description="Browse all projects — commercial campaigns, documentary films, and brand storytelling."
        canonicalUrl={`${SITE_URL}/portfolio/projects`}
      />
      <main className="max-w-screen-xl mx-auto px-6 pt-12 pb-16">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search projects, clients, or types..."
            className="flex-1"
          />

          <CustomDropdown
            options={typeOptions}
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            icon={<Film size={16} />}
            ariaLabel="Filter by project type"
            className="w-full sm:w-44 lg:w-52"
          />

          <CustomDropdown
            options={clientOptions}
            value={clientFilter}
            onChange={(val) => setClientFilter(val)}
            icon={<Users size={16} />}
            ariaLabel="Filter by client"
            className="w-full sm:w-44 lg:w-52"
          />
        </div>

        {hasActiveFilters && (
          <div className="mb-6 flex items-center justify-between">
            <p
              className="text-neutral-500"
              style={{ fontFamily: designTokens.typography.fontFamily, fontSize: '14px' }}
            >
              Showing {filteredProjects.length} of {projects.length} items
            </p>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
              style={{ fontFamily: designTokens.typography.fontFamily, fontSize: '14px' }}
            >
              <X size={14} />
              Clear filters
            </button>
          </div>
        )}

        <ProjectGrid
          projects={filteredProjects}
          initialLoading={initialLoading}
          loadingMore={loadingMore && !searchQuery.trim() && typeFilter === 'all' && clientFilter === 'all'}
          skeletonCount={skeletonCount}
          batchSize={BATCH_SIZE}
          onImageLoad={handleImageLoad}
          observerTarget={!searchQuery.trim() && typeFilter === 'all' && clientFilter === 'all' ? observerTarget : undefined}
        />
      </main>
    </div>
  );
};

export default ProjectsListPage;
