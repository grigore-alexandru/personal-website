'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import { isChromelessRoute } from '../utils/isChromelessRoute';

export default function ConditionalHeader() {
  const pathname = usePathname();
  if (isChromelessRoute(pathname)) return null;
  return <Header />;
}
