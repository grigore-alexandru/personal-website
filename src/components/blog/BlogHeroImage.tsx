'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface BlogHeroImageProps {
  src: string;
  alt: string;
}

const BlogHeroImage: React.FC<BlogHeroImageProps> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full pt-[62%] overflow-hidden rounded-lg shadow-sm">
      {/* Skeleton — fades out once the image is ready */}
      <div
        className={`absolute inset-0 skeleton-shimmer transition-opacity duration-500 ${
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />

      {/* Image — fades in independently of the text above */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 768px"
        className={`object-cover transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        priority
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export default BlogHeroImage;
