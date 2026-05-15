'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Maximize, Link } from 'lucide-react';
import YouTube from 'react-youtube';
import { ContentWithProject } from '../../types';
import { designTokens } from '../../styles/tokens';

interface ContentDetailModalProps {
  content: ContentWithProject;
  onClose: () => void;
}

const getYoutubeDetails = (url: string): { videoId: string | null; start: number | undefined } => {
  if (!url) return { videoId: null, start: undefined };

  let videoId: string | null = null;

  if (url.includes('/shorts/')) {
    const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      videoId = shortsMatch[1];
    }
  }

  if (!videoId) {
    const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    videoId = match && match[1].length === 11 ? match[1] : null;
  }

  let start: number | undefined;
  const timeMatch = url.match(/[?&]t=(\d+)/);
  if (timeMatch) {
    start = parseInt(timeMatch[1], 10);
  }

  return { videoId, start };
};

const getVimeoEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/);
  const videoId = match ? match[1] : null;
  if (videoId) {
    return `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`;
  }
  return url;
};

export function ContentDetailModal({ content, onClose }: ContentDetailModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isImage = content.content_type.slug === 'image';
  const isPortrait = content.format === 'portrait';
  const isYoutube = !isImage && (content.platform === 'youtube' || content.url.includes('youtube.com') || content.url.includes('youtu.be'));
  const isVimeo = !isImage && !isYoutube && (content.platform === 'vimeo' || content.url.includes('vimeo.com'));
  const isDirectFile = !isYoutube && !isVimeo;

  const youtubeDetails = isYoutube ? getYoutubeDetails(content.url) : { videoId: null, start: undefined };
  const vimeoUrl = isVimeo ? getVimeoEmbedUrl(content.url) : content.url;

  const year = content.published_at ? new Date(content.published_at).getFullYear() : null;

  useEffect(() => {
    if (!isDirectFile) return;
    if (isImage) {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setNaturalAspectRatio(img.naturalWidth / img.naturalHeight);
        }
      };
      img.src = content.url;
    }
  }, [content.url, isImage, isDirectFile]);

  const handleVideoMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.videoWidth && video.videoHeight) {
      setNaturalAspectRatio(video.videoWidth / video.videoHeight);
    }
  }, []);

  const handleShare = useCallback(() => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setShowCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setShowCopied(false), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const handleFullscreen = () => {
    const imgElement = document.getElementById('content-fullscreen-img') as HTMLImageElement;
    if (imgElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        imgElement.requestFullscreen();
        setIsFullscreen(true);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={overlayRef}
      /* 1. Increased z-index to 100 to ensure it covers ANY site navigation */
      /* 2. Added responsive padding so the modal doesn't touch screen edges on tablets */
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 lg:p-12 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        /* 3. Changed max-w-6xl to max-w-5xl for better desktop proportions */
        /* 4. Strictly enforced max-height using calc() to guarantee it never overflows the viewport */
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)] overflow-hidden animate-scaleIn flex flex-col relative"
      >
        {/* 5. Header is now explicitly flex-shrink-0 instead of sticky.
               This completely prevents the scrollable content from ever overlapping it. */}
        <div className="flex-shrink-0 z-10 flex items-center justify-between p-5 md:p-6 border-b border-gray-200 bg-white shadow-sm">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 leading-tight tracking-tight">{content.title}</h2>
            {year && (
              <p className="text-sm text-gray-500 font-medium">{year}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-4 relative">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Copy link to clipboard"
            >
              <Link className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            {showCopied && (
              <div className="absolute top-full right-0 mt-2 animate-copiedFadeIn z-50">
                <div
                  className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg text-sm font-medium text-gray-800 whitespace-nowrap"
                  style={{
                    boxShadow: designTokens.shadows.lifted,
                    border: `1px solid ${designTokens.colors.neutral[200]}`,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: designTokens.colors.success[500] }}
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  Link copied to clipboard
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 6. The scrollable content is now natively isolated from the header */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-5 md:p-8 space-y-8">
            <div
              className="relative bg-gray-100 rounded-lg overflow-hidden animate-slideIn mx-auto shadow-inner"
              style={
                isDirectFile && naturalAspectRatio !== null
                  ? {
                      aspectRatio: String(naturalAspectRatio),
                      maxWidth: naturalAspectRatio < 1 ? '320px' : '100%',
                    }
                  : {
                      aspectRatio: isPortrait ? '9/16' : '16/9',
                      maxWidth: isPortrait ? '320px' : '100%',
                    }
              }
            >
              {isImage ? (
                <>
                  <img
                    id="content-fullscreen-img"
                    src={content.url}
                    alt={content.title}
                    className="w-full h-full object-contain bg-black/5"
                  />
                  <button
                    onClick={handleFullscreen}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors z-10 backdrop-blur-md"
                    aria-label="Fullscreen"
                  >
                    <Maximize className="w-5 h-5 text-white" />
                  </button>
                </>
              ) : isDirectFile ? (
                <video
                  src={content.url}
                  className="w-full h-full object-contain bg-black"
                  controls
                  onLoadedMetadata={handleVideoMetadata}
                  onError={() => setIframeError(true)}
                />
              ) : (
                <div className="w-full h-full relative">
                  {iframeLoading && !iframeError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
                    </div>
                  )}

                  {iframeError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white px-4 z-10">
                      <div className="text-center">
                        <p className="mb-2 font-medium">Unable to load video</p>
                        <a
                          href={content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline hover:text-gray-300 transition-colors"
                        >
                          Open in new tab
                        </a>
                      </div>
                    </div>
                  ) : isYoutube && youtubeDetails.videoId ? (
                    <YouTube
                      videoId={youtubeDetails.videoId}
                      className="w-full h-full"
                      iframeClassName="w-full h-full"
                      opts={{
                        height: '100%',
                        width: '100%',
                        playerVars: {
                          autoplay: 0,
                          modestbranding: 1,
                          rel: 0,
                          start: youtubeDetails.start,
                        },
                      }}
                      onReady={() => setIframeLoading(false)}
                      onError={() => {
                        setIframeError(true);
                        setIframeLoading(false);
                      }}
                    />
                  ) : (
                    <iframe
                      src={vimeoUrl || ''}
                      title={content.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={() => setIframeLoading(false)}
                      onError={() => {
                        setIframeError(true);
                        setIframeLoading(false);
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {content.project_info && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-gray-100 animate-slideIn">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Client
                  </p>
                  <p className="text-base text-gray-900 font-medium">
                    {content.project_info.client_name}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Type
                  </p>
                  <p className="text-base text-gray-900 font-medium">
                    {content.project_info.project_type_name}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Project
                  </p>
                  <p className="text-base text-gray-900 font-medium">
                    {content.project_info.project_title || '—'}
                  </p>
                </div>
              </div>
            )}

            {content.contributors && content.contributors.length > 0 && (
              <div className="animate-slideIn">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Collaborators
                </p>
                <div className="space-y-2.5">
                  {content.contributors.map((contributor, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-1.5"
                    >
                      <span className="font-medium text-gray-900 text-sm md:text-base">
                        {contributor.name}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {contributor.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {content.caption && (
              <div className="animate-slideIn pt-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Caption
                </p>
                <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                  {content.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideInContent {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes copiedFadeIn {
          0% {
            opacity: 0;
            transform: translateY(-6px) scale(0.96);
          }
          15% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-4px) scale(0.97);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-scaleIn {
          /* Swapped to a smoother bezier curve instead of the highly aggressive spring */
          animation: scaleIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .animate-slideIn {
          animation: slideInContent 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
          opacity: 0;
        }

        .animate-copiedFadeIn {
          animation: copiedFadeIn 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}