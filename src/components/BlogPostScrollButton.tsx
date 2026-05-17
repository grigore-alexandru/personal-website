'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function BlogPostScrollButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <Link
      href="/blog"
      aria-label="Back to blog"
      className="fixed bottom-8 left-8 z-50 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-neutral-800 hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
    >
      <ArrowLeft size={20} />
    </Link>
  );
}
