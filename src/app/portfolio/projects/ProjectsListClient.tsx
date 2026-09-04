'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Film, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from '../../../components/ui/SearchBar';
import { Project } from '../../../types';
import { loadProjects, countProjects } from '../../../utils/dataLoader';
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
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [totalCount, setTotalCount] = useState(totalProjects);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialProjects.length < totalProjects);
  const [viewportImagesLoaded, setViewportImagesLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useUrlFilter('q', '', true);
  const [typeFilter, setTypeFilter] = useUrlFilter('type', 'all');
  const [clientFilter, setClientFilter] = useUrlFilter('client', 'all');

  const loadedCountRef = useRef(0);
  // Tracks exactly how many new images will mount in the current batch.
  // Set before each setProjects call so handleImageLoad always checks against
  // the right count — not the accumulated total, not the batchSize ceiling.
  const expectedImageCountRef = useRef(initialProjects.length);
  const isInitialMount = useRef(true);
  const isMountedRef = useRef(true);
  const fetchVersionRef = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Read URL params (post-debounce for search) to drive server refetches
  const urlSearch = searchParams.get('q')      ?? '';
  const urlType   = searchParams.get('type')   ?? 'all';
  const urlClient = searchParams.get('client') ?? 'all';

  // When URL params change, reset and fetch filtered first page
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    fetchVersionRef.current += 1;
    const version = fetchVersionRef.current;

    const filters = { q: urlSearch, type: urlType, client: urlClient };

    setProjects([]);
    setHasMore(false);
    setViewportImagesLoaded(false);
    loadedCountRef.current = 0;
    setLoadingMore(true);

    Promise.all([
      loadProjects(batchSize, 0, filters),
      countProjects(filters),
    ])
      .then(([newProjects, count]) => {
        if (!isMountedRef.current || fetchVersionRef.current !== version) return;
        expectedImageCountRef.current = newProjects.length;
        setProjects(newProjects);
        setTotalCount(count);
        setHasMore(newProjects.length < count);
        // No images will mount → arm the observer immediately.
        if (newProjects.length === 0) setViewportImagesLoaded(true);
      })
      .catch((err) => {
        console.error('Error fetching filtered projects:', err);
      })
      .finally(() => {
        if (isMountedRef.current && fetchVersionRef.current === version) {
          setLoadingMore(false);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch, urlType, urlClient]);

  const handleImageLoad = useCallback(() => {
    if (viewportImagesLoaded) return;
    loadedCountRef.current += 1;
    const expected = expectedImageCountRef.current;
    if (expected > 0 && loadedCountRef.current >= expected) {
      setViewportImagesLoaded(true);
    }
  }, [viewportImagesLoaded]);

  const loadMoreProjects = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setViewportImagesLoaded(false);
    loadedCountRef.current = 0;

    const filters = { q: urlSearch, type: urlType, client: urlClient };

    try {
      const newProjects = await loadProjects(batchSize, projects.length, filters);
      if (!isMountedRef.current) return;
      // Only the newly-mounted cards will fire handleImageLoad — set the
      // threshold to the batch size, not the accumulated total.
      expectedImageCountRef.current = newProjects.length;
      setProjects((prev) => {
        const updated = [...prev, ...newProjects];
        setHasMore(updated.length < totalCount);
        return updated;
      });
    } catch (error) {
      console.error('Error loading more projects:', error);
    } finally {
      if (isMountedRef.current) setLoadingMore(false);
    }
  }, [projects.length, hasMore, loadingMore, totalCount, batchSize, urlSearch, urlType, urlClient]);

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

  const clearFilters = useClearUrlFilters(['q', 'type', 'client']);
  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all' || clientFilter !== 'all';
  const skeletonCount = Math.min(totalCount, batchSize);

  return (
    <div className="min-h-screen bg-white">
      {/* Visually hidden: see the note in BlogListClient. */}
      <h1 className="sr-only">Projects</h1>
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

        {hasActiveFilters && projects.length > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <p
              className="text-neutral-500"
              style={{ fontFamily: designTokens.typography.fontFamily, fontSize: '14px' }}
            >
              Showing {projects.length} of {totalCount} items
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
          projects={projects}
          initialLoading={false}
          loadingMore={loadingMore}
          skeletonCount={skeletonCount}
          batchSize={batchSize}
          onImageLoad={handleImageLoad}
          observerTarget={observerTarget}
        />
      </main>
    </div>
  );
};

export default ProjectsListClient;
