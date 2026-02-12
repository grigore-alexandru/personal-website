import { useEffect, useState, useRef } from 'react';
import { X, Maximize } from 'lucide-react';
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
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isImage = content.content_type.slug === 'image';
  const isPortrait = content.format === 'portrait';
  const isYoutube = !isImage && (content.platform === 'youtube' || content.url.includes('youtube.com') || content.url.includes('youtu.be'));
  const isVimeo = !isImage && !isYoutube && (content.platform === 'vimeo' || content.url.includes('vimeo.com'));

  const youtubeDetails = isYoutube ? getYoutubeDetails(content.url) : { videoId: null, start: undefined };
  const vimeoUrl = isVimeo ? getVimeoEmbedUrl(content.url) : content.url;

  const year = content.published_at ? new Date(content.published_at).getFullYear() : null;

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
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-scaleIn flex flex-col"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{content.title}</h2>
            {year && (
              <p className="text-sm text-gray-600">{year}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-4"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div
              className="relative bg-gray-100 rounded-lg overflow-hidden animate-slideIn mx-auto"
              style={{
                aspectRatio: isPortrait ? '9/16' : '16/9',
                maxWidth: isPortrait ? '300px' : '100%',
              }}
            >
              {isImage ? (
                <>
                  <img
                    id="content-fullscreen-img"
                    src={content.url}
                    alt={content.title}
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={handleFullscreen}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors z-10"
                    aria-label="Fullscreen"
                  >
                    <Maximize className="w-5 h-5 text-white" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full relative">
                  {iframeLoading && !iframeError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                    </div>
                  )}

                  {iframeError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white px-4 z-10">
                      <div className="text-center">
                        <p className="mb-2">Unable to load video</p>
                        <a
                          href={content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline hover:text-gray-300"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-3 border-b border-gray-200 animate-slideIn">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Client
                  </p>
                  <p className="text-base text-gray-900 font-medium">
                    {content.project_info.client_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Type
                  </p>
                  <p className="text-base text-gray-900 font-medium">
                    {content.project_info.project_type_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
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
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Collaborators
                </p>
                <div className="space-y-2">
                  {content.contributors.map((contributor, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2"
                    >
                      <span className="font-medium text-gray-900">
                        {contributor.name}
                      </span>
                      <span className="text-gray-600 text-sm">
                        {contributor.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {content.caption && (
              <div className="animate-slideIn">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Caption
                </p>
                <p className="text-gray-700 leading-relaxed">
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
            transform: scale(0.85);
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInContent {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-scaleIn {
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-slideIn {
          animation: slideInContent 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
