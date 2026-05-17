import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  currentSection?: string;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
