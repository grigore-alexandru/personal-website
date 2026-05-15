'use client';

import dynamic from 'next/dynamic';
import { TipTapContent } from '../../types';

const TipTapRenderer = dynamic(() => import('./TipTapRenderer'), { ssr: false });

interface TipTapRendererClientProps {
  content: TipTapContent;
  className?: string;
}

export default function TipTapRendererClient({ content, className }: TipTapRendererClientProps) {
  return <TipTapRenderer content={content} className={className} />;
}
