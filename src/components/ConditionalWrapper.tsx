'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function ConditionalWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return <>{children}</>;
  return <div className="pt-[80px]">{children}</div>;
}
