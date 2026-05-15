import { useNavigate } from 'react-router-dom';
import { FileText, Video, Settings, Image, Minimize2 } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const navigationCards = [
    {
      title: 'Blog Management',
      description: 'Create, edit, and manage blog posts',
      icon: FileText,
      path: '/admin/blog',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      title: 'Portfolio Management',
      description: 'Manage video projects and portfolio items',
      icon: Video,
      path: '/admin/portfolio',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      title: 'Content Management',
      description: 'Manage media content, videos, and images',
      icon: Image,
      path: '/admin/content',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
    {
      title: 'Media Compressor',
      description: 'Compress images and videos for optimal performance',
      icon: Minimize2,
      path: '/admin/compressor',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
  ];

  return (
    <AdminLayout currentSection="Dashboard">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black mb-2">Welcome to Admin Panel</h2>
          <p className="text-neutral-600">Select a section to manage your content</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                className="group relative bg-white rounded-xl border-2 border-neutral-200 p-8 text-left transition-all hover:border-black hover:shadow-lg"
              >
                <div className={`inline-flex p-3 rounded-lg ${card.color} mb-4 transition-colors ${card.hoverColor}`}>
                  <Icon size={28} className="text-white" />
                </div>

                <h3 className="text-xl font-bold text-black mb-2 group-hover:text-black">
                  {card.title}
                </h3>

                <p className="text-neutral-600 text-sm">
                  {card.description}
                </p>

                <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-black"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
