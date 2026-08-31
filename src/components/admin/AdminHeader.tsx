'use client';

import { LogOut, User } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from '../../utils/authService';

interface AdminHeaderProps {
  userEmail: string | null;
}

interface NavItem {
  label: string;
  path: string;
}

export function AdminHeader({ userEmail }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: 'Blog',       path: '/admin/blog' },
    { label: 'Portfolio',  path: '/admin/portfolio' },
    { label: 'Content',    path: '/admin/content' },
    { label: 'Links',      path: '/admin/links' },
    { label: 'Documents',  path: '/admin/documents' },
  ];

  const isActive = (path: string) => pathname?.startsWith(path) ?? false;

  const handleLogout = async () => {
    await signOut();
    router.push('/admin/login');
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => router.push('/admin')}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <h1 className="text-2xl font-bold text-black">Admin Panel</h1>
            </button>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-black text-white font-bold'
                      : 'text-neutral-700 hover:bg-neutral-100 font-medium'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {userEmail && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-600">
                <User size={16} />
                <span>{userEmail}</span>
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
