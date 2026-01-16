import React from 'react';
import Header from './Header';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-[80px]">
        {children}
      </main>
    </div>
  );
}
