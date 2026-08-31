'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { isChromelessRoute } from '../utils/isChromelessRoute';

export default function ConditionalWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isChromelessRoute(pathname)) return <>{children}</>;
  return <div className="pt-[80px]">{children}</div>;
}
