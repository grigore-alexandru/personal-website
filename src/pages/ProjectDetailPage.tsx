import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Project } from '../types';
import { loadProject, loadProjects } from '../utils/dataLoader';
import ProjectHero from '../components/ProjectHero';
import MetaTriplet from '../components/MetaTriplet';
import StatsPanel from '../components/StatsPanel';
import VideoCarousel from '../components/VideoCarousel';
import Testimonial from '../components/Testimonial';
import { designTokens } from '../styles/tokens';

const ProjectDetailPage: React.FC = () => {
  const { clientSlug, projectSlug } = useParams<{ clientSlug: string; projectSlug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBackButton, setShowBackButton] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      if (!clientSlug || !projectSlug) return;

      try {
        const [projectData, projectsData] = await Promise.all([
          loadProject(clientSlug, projectSlug),
          loadProjects()
        ]);

        setProject(projectData);
        setAllProjects(projectsData);
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [clientSlug, projectSlug]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackButton(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black mb-4">Project Not Found</h1>
            <Link
              to="/portfolio"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Return to Portfolio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = allProjects.findIndex(p => p.title === project.title);
  const prevProject = currentIndex > 0 ? allProjects[currentIndex - 1] : null;
  const nextProject = currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Back Button */}
      {showBackButton && (
        <Link
          to="/portfolio"
          className="fixed bottom-8 left-8 z-50 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
      )}

      {/* Project Hero */}
      <ProjectHero 
        bgUrl={project.poster} 
        title={project.title}
        type={project.type}
        client={project.client_name}
        date={project.date}
      />

      {/* Stats Panel */}
      <div className="-mt-1">
        <StatsPanel 
          views={project.reach.views}
          channels={project.reach.channels}
          impressions={project.reach.impressions}
        />
      </div>

      {/* Project Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-4">
        {/* About Section */}
        <section className="py-12 md:py-16">
          <h2 
            className="text-black font-bold mb-6 text-center"
            style={{
              fontSize: designTokens.typography.sizes.xl,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
            }}
          >
            About the Project
          </h2>
          <p 
            className="text-gray-700 leading-relaxed"
            style={{
              fontSize: designTokens.typography.sizes.md,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.regular,
              lineHeight: designTokens.typography.lineHeights.body,
            }}
          >
            {project.description}
          </p>
        </section>

        {/* Video Carousel */}
        <section className="py-12 md:py-16">
          <h2 
            className="text-black font-bold mb-6 text-center"
            style={{
              fontSize: designTokens.typography.sizes.xl,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
            }}
          >
            Watch the Project
          </h2>
          <VideoCarousel videos={project.videos} />
        </section>

        {/* Testimonials */}
        <section className="py-12 md:py-16">
          <h2 
            className="text-black font-bold mb-6 text-center"
            style={{
              fontSize: designTokens.typography.sizes.xl,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
            }}
          >
            Client Testimonial
          </h2>
          <Testimonial 
            client={project.testimonial.client}
            text={project.testimonial.text}
            role={project.testimonial.role}
          />
        </section>

        {/* Navigation */}
        <section className="py-12 md:py-16">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            {prevProject ? (
              <Link
                to={`/portfolio/${prevProject.client_name.toLowerCase().replace(/\s+/g, '-')}/${prevProject.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Previous Project</span>
              </Link>
            ) : <div />}

            <Link
              to="/portfolio"
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              View All Projects
            </Link>

            {nextProject ? (
              <Link
                to={`/portfolio/${nextProject.client_name.toLowerCase().replace(/\s+/g, '-')}/${nextProject.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
              >
                <span>Next Project</span>
                <ArrowRight size={20} />
              </Link>
            ) : <div />}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProjectDetailPage;