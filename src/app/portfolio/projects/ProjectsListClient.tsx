'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Film, Users } from 'lucide-react';
import { SearchBar } from '../../../components/ui/SearchBar';
import { Project } from '../../../types';
import { loadProjects } from '../../../utils/dataLoader';
import CustomDropdown from '../../../components/forms/CustomDropdown';
import ProjectGrid from '../../../components/project/ProjectGrid';
import { designTokens } from '../../../styles/tokens';
import { useUrlFilter, useClearUrlFilters } from '../../../hooks/useUrlFilters';

interface ProjectsListClientProps {
  initialProjects: Project[];
  totalProjects: number;
  typeOptions: { value: string; label: string }[];
  clientOptions: { value: string; label: string }[];
  batchSize: number;
}

const ProjectsListClient: React.FC<ProjectsListClientProps> = ({
  initialProjects,
  totalProjects,
  typeOptions,
  clientOptions,
  batchSize,
}) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '', true);
  const [typeFilter, setTypeFilter] = useUrlFilter('type', 'all');
  const [clientFilter, setClientFilter] = useUrlFilter('client', 'all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialProjects.length < totalProjects);
  const [viewportImagesLoaded, setViewportImagesLoaded] = useState(false);
  const loadedCountRef = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleImageLoad = useCallback(() => {
    if (viewportImagesLoaded) return;
    loadedCountRef.current += 1;
    const target = filteredProjects.length > 0 ? filteredProjects.length : batchSize;
    if (loadedCountRef.current >= target) {
      setViewportImagesLoaded(true);
    }
  }, [filteredProjects.length, viewportImagesLoaded, batchSize]);

  const loadMoreProjects = useCallback(async () => {
    if (loadingMore || !hasMore || searchQuery.trim() || typeFilter !== 'all' || clientFilter !== 'all') return;

    setLoadingMore(true);
    setViewportImagesLoaded(false);
    loadedCountRef.current = 0;

    try {
      const newProjects = await loadProjects(batchSize, projects.length);
      setProjects((prev) => {
        const updated = [...prev, ...newProjects];
        setHasMore(updated.length < totalProjects);
        return updated;
      });
    } catch (error) {
      console.error('Error loading more projects:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [projects.length, hasMore, loadingMore, totalProjects, searchQuery, typeFilter, clientFilter, batchSize]);

  useEffect(() => {
    if (!viewportImagesLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreProjects();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, loadingMore, loadMoreProjects, viewportImagesLoaded]);

  useEffect(() => {
    let filtered = projects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.title.toLowerCase().includes(q) ||
          project.client_name.toLowerCase().includes(q) ||
          project.project_type.name.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((project) => project.project_type.slug === typeFilter);
    }

    if (clientFilter !== 'all') {
      filtered = filtered.filter((project) => project.client_name === clientFilter);
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, typeFilter, clientFilter]);

  useEffect(() => {
    loadedCountRef.current = 0;
    setViewportImagesLoaded(false);
  }, [searchQuery, typeFilter, clientFilter]);

  const clearFilters = useClearUrlFilters(['q', 'type', 'client']);
  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all' || clientFilter !== 'all';
  const skeletonCount = Math.min(totalProjects, batchSize);

  return (
    <div className="min-h-screen bg-white">
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
          initialLoading={false}
          loadingMore={loadingMore && !searchQuery.trim() && typeFilter === 'all' && clientFilter === 'all'}
          skeletonCount={skeletonCount}
          batchSize={batchSize}
          onImageLoad={handleImageLoad}
          observerTarget={
            !searchQuery.trim() && typeFilter === 'all' && clientFilter === 'all'
              ? observerTarget
              : undefined
          }
        />
      </main>
    </div>
  );
};

export default ProjectsListClient;
