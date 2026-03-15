import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Film } from 'lucide-react';
import { SearchBar } from '../components/ui/SearchBar';
import { Project, ProjectType } from '../types';
import { loadProjects, countProjects } from '../utils/dataLoader';
import { loadProjectTypes } from '../utils/portfolioService';
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
  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([
    { value: 'all', label: 'All Types' },
  ]);
  const [hasMore, setHasMore] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [viewportImagesLoaded, setViewportImagesLoaded] = useState(false);
  const loadedCountRef = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsData, typesData, total] = await Promise.all([
          loadProjects(BATCH_SIZE, 0),
          loadProjectTypes(),
          countProjects(),
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
    if (loadingMore || !hasMore || searchQuery.trim() || typeFilter !== 'all') return;

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
  }, [projects.length, hasMore, loadingMore, totalProjects, searchQuery, typeFilter]);

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

    setFilteredProjects(filtered);
  }, [projects, searchQuery, typeFilter]);

  useEffect(() => {
    loadedCountRef.current = 0;
    setViewportImagesLoaded(false);
  }, [searchQuery, typeFilter]);

  const clearFilters = useClearUrlFilters(['q', 'type']);

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all';

  const skeletonCount = totalProjects > 0
    ? Math.min(totalProjects, BATCH_SIZE)
    : BATCH_SIZE;

  return (
    <div className="min-h-screen bg-white">
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
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
            icon={<Film size={18} className="text-gray-400" />}
            className="sm:w-64"
          />
        </div>

        {hasActiveFilters && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-black underline"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.sm,
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      <section className="pb-16">
        <ProjectGrid
          projects={filteredProjects}
          initialLoading={initialLoading}
          loadingMore={loadingMore && !searchQuery.trim() && typeFilter === 'all'}
          skeletonCount={skeletonCount}
          batchSize={BATCH_SIZE}
          onImageLoad={handleImageLoad}
          observerTarget={!searchQuery.trim() && typeFilter === 'all' ? observerTarget : undefined}
        />
      </section>
    </div>
  );
};

export default ProjectsListPage;
