import { LogOut, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from '../../utils/authService';
import { useAuth } from '../../hooks/useAuth';

interface AdminHeaderProps {
  currentSection?: string;
}

interface NavItem {
  label: string;
  path: string;
  sections: string[];
}

export function AdminHeader({ currentSection = 'Dashboard' }: AdminHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    {
      label: 'Blog',
      path: '/admin/blog',
      sections: ['Blog Management', 'Dashboard']
    },
    {
      label: 'Portfolio',
      path: '/admin/portfolio',
      sections: ['Portfolio Management']
    },
    {
      label: 'Content',
      path: '/admin/content',
      sections: ['Content Management']
    },
    {
      label: 'Compressor',
      path: '/admin/compressor',
      sections: ['Media Compressor']
    }
  ];

  const isNavItemActive = (item: NavItem) => {
    return item.sections.includes(currentSection) || location.pathname.startsWith(item.path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/admin')}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <h1 className="text-2xl font-bold text-black">Admin Panel</h1>
              <p className="text-sm text-neutral-600 mt-1">{currentSection}</p>
            </button>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    isNavItemActive(item)
                      ? 'bg-black text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user?.email && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-600">
                <User size={16} />
                <span>{user.email}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
