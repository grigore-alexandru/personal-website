import { ReactNode } from 'react';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
  currentSection?: string;
}

export function AdminLayout({ children, currentSection }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminHeader currentSection={currentSection} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
