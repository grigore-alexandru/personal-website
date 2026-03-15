import React, { useState, useEffect, useMemo } from 'react';
import { Film, Users } from 'lucide-react';
import { SearchBar } from '../components/ui/SearchBar';
import { Project, Filter, ProjectType } from '../types';
import { loadProjects } from '../utils/dataLoader';
import { loadProjectTypes } from '../utils/portfolioService';
import CustomDropdown from '../components/forms/CustomDropdown';
import MasonryGrid from '../components/MasonryGrid';
import { designTokens } from '../styles/tokens';
import { useUrlFilter, useClearUrlFilters } from '../hooks/useUrlFilters';
import { X } from 'lucide-react';

const PortfolioPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '');
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useUrlFilter('type', 'all');
  const [clientFilter, setClientFilter] = useUrlFilter('client', 'all');
  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([
    { value: 'all', label: 'All Types' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsData, typesData] = await Promise.all([
          loadProjects(),
          loadProjectTypes(),
        ]);

        setProjects(projectsData);
        setFilteredProjects(projectsData);

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
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const clientOptions = useMemo(() => {
    const clients = new Set<string>();
    projects.forEach(p => { if (p.client_name) clients.add(p.client_name); });
    return [
      { value: 'all', label: 'All Clients' },
      ...Array.from(clients).sort().map(c => ({ value: c, label: c })),
    ];
  }, [projects]);

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

  const clearFilters = useClearUrlFilters(['q', 'type', 'client']);

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all' || clientFilter !== 'all';

  return (
    <div className="min-h-screen bg-white">
      <section className="max-w-4xl mx-auto px-6 pt-12 pb-8">
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
            icon={<Film size={16} />}
            ariaLabel="Filter by project type"
            className="w-full sm:w-44 lg:w-52"
          />

          <CustomDropdown
            options={clientOptions}
            value={clientFilter}
            onChange={setClientFilter}
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
              Showing {filteredProjects.length} of {projects.length} projects
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
      </section>

      <section className="pb-16">
        <MasonryGrid projects={filteredProjects} loading={loading} />
      </section>
    </div>
  );
};

export default PortfolioPage;
