import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../utils/authService';
import { useAuth } from '../../hooks/useAuth';

interface AdminHeaderProps {
  currentSection?: string;
}

export function AdminHeader({ currentSection = 'Dashboard' }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-2xl font-bold text-black">Admin Panel</h1>
              <p className="text-sm text-neutral-600 mt-1">{currentSection}</p>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <button
                disabled
                className="text-sm text-neutral-400 cursor-not-allowed"
              >
                Posts
              </button>
              <button
                disabled
                className="text-sm text-neutral-400 cursor-not-allowed"
              >
                Projects
              </button>
              <button
                disabled
                className="text-sm text-neutral-400 cursor-not-allowed"
              >
                Settings
              </button>
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
