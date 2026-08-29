'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Maximize2,
  Copy,
  Check,
} from 'lucide-react';
import YouTube from 'react-youtube';
import { ContentWithProject } from '../../types';
import { designTokens as dt } from '../../styles/tokens';

/* ─────────────────────────────────────────────────────────────────────────
   Token aliases
   ───────────────────────────────────────────────────────────────────────── */
const sp  = dt.spacing.scale;      // xxs=4 xs=8 sm=16 md=24 lg=32 xl=48 xxl=64
const ty  = dt.typography;
const cl  = dt.colors;
const sh  = dt.shadows;

const TEXT2 = cl.semantic.textSecondary;  // #525252
const MUTED = cl.semantic.textMuted;      // #a3a3a3

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */
function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const shorts = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts) return shorts[1];
  const m = url.match(/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[1].length === 11 ? m[1] : null;
}
function getYoutubeStart(url: string): number | undefined {
  const m = url.match(/[?&]t=(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}
function getVimeoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/
  );
  if (!m) return url;
  return `https://player.vimeo.com/video/${m[1]}?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────────────────── */

/** Prev / Next — plain chevron, no fill/circle. Gray at rest, pink on hover. */
function NavArrow({
  direction,
  slug,
}: {
  direction: 'prev' | 'next';
  slug: string | null;
}) {
  const router = useRouter();
  const Icon   = direction === 'prev' ? ChevronLeft : ChevronRight;
  const label  = direction === 'prev' ? 'Previous item' : 'Next item';

  if (!slug) {
    return (
      <span className="flex items-center justify-center p-1.5 lg:p-2 cursor-not-allowed" aria-disabled>
        <Icon strokeWidth={2} className="w-6 h-6 lg:w-8 lg:h-8 text-neutral-200" />
      </span>
    );
  }

  return (
    <button
      onClick={() => router.push(`/portfolio/content/${slug}`)}
      aria-label={label}
      className="flex items-center justify-center p-1.5 lg:p-2 text-neutral-400 hover:text-accent-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-md"
    >
      <Icon strokeWidth={2} className="w-6 h-6 lg:w-8 lg:h-8" />
    </button>
  );
}

/** Video load error */
function VideoError({ url }: { url: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-10 rounded-lg"
      style={{ background: cl.neutral[100] }}
    >
      <div className="text-center">
        <p
          className="font-semibold mb-1"
          style={{ fontSize: ty.sizes.xs, color: TEXT2, fontFamily: ty.fontFamily }}
        >
          Unable to load video
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-70 transition-opacity"
          style={{ fontSize: ty.sizes.xxs, color: cl.semantic.textLink, fontFamily: ty.fontFamily }}
        >
          Open in new tab →
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Props
   ───────────────────────────────────────────────────────────────────────── */
interface ContentDetailViewProps {
  content: ContentWithProject;
  prevSlug: string | null;
  nextSlug: string | null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────────────────── */
export function ContentDetailView({ content, prevSlug, nextSlug }: ContentDetailViewProps) {
  const router = useRouter();

  const isImage      = content.content_type.slug === 'image';
  const isPortrait   = content.format === 'portrait';
  const isYoutube    = !isImage && (content.platform === 'youtube' || content.url.includes('youtube.com') || content.url.includes('youtu.be'));
  const isVimeo      = !isImage && !isYoutube && (content.platform === 'vimeo' || content.url.includes('vimeo.com'));
  const isDirectFile = !isImage && !isYoutube && !isVimeo;

  const youtubeId    = isYoutube ? getYoutubeId(content.url) : null;
  const youtubeStart = isYoutube ? getYoutubeStart(content.url) : undefined;
  const vimeoUrl     = isVimeo   ? getVimeoEmbedUrl(content.url) : null;
  const dateStr      = content.published_at ?? content.created_at;

  const [iframeReady, setIframeReady]   = useState(false);
  const [iframeError, setIframeError]   = useState(false);
  const [copied, setCopied]             = useState(false);
  /* Drives the skeleton for <img> and <video> (iframes use iframeReady). */
  const [mediaLoaded, setMediaLoaded]   = useState(false);
  /* Exact pixel size of the media box (w,h) plus the media region's width
     (frameW), all fitted to the viewport-height hero. frameW lets the top/
     bottom rows size themselves halfway between the media box and the full
     column width instead of always spanning the whole column. */
  const [box, setBox]                   = useState<{ w: number; h: number; frameW: number } | null>(null);
  /* Whether the reader has scrolled past the hero — hides the scroll hint. */
  const [hasScrolled, setHasScrolled]   = useState(false);
  /* True while an image is opened fullscreen (so it shows uncropped there). */
  const [isFullscreen, setIsFullscreen] = useState(false);
  const copiedTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgRef        = useRef<HTMLImageElement>(null);
  const mediaFrameRef = useRef<HTMLDivElement>(null);
  const moreRef       = useRef<HTMLDivElement>(null);

  /* keyboard nav */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  && prevSlug) router.push(`/portfolio/content/${prevSlug}`);
      if (e.key === 'ArrowRight' && nextSlug) router.push(`/portfolio/content/${nextSlug}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevSlug, nextSlug, router]);

  /* ── Fit the media box to the exact space the hero leaves ──────────────
     The hero is a fixed-height (viewport) flex column; the media region
     flexes to fill whatever vertical space the title/metadata/columns do
     not use. We size the media box to the largest aspect-correct rectangle
     that fits inside that region, so the whole hero always fills the
     viewport down to the grey separator — at any screen size/orientation.
     A ResizeObserver on the region recomputes on viewport resize, dynamic
     mobile-toolbar changes, and breakpoint-driven metadata reflows. */
  useEffect(() => {
    const region = mediaFrameRef.current;
    if (!region) return;
    const ratio = isPortrait ? 9 / 16 : 16 / 9;
    const recompute = () => {
      const RW = region.clientWidth;
      const RH = region.clientHeight;
      if (!RW || !RH) return;
      let w = RH * ratio;
      let h = RH;
      if (w > RW) { w = RW; h = RW / ratio; }   // width-constrained → shrink height to keep ratio
      setBox({ w: Math.round(w), h: Math.round(h), frameW: Math.round(RW) });
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(region);
    return () => ro.disconnect();
  }, [isPortrait]);

  /* Hide the "scroll for more" hint once the reader starts scrolling. */
  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* copy link */
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2200);
  }, []);
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  /* fullscreen image */
  const handleFullscreen = useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
  }, []);

  /* Smoothly reveal the below-the-fold detail sections. */
  const scrollToMore = useCallback(() => {
    moreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /* Track fullscreen so the in-box object-cover relaxes to object-contain
     while fullscreen — filling the box in-page, but never cropping there. */
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  /* Aspect ratio comes purely from the DB `format` field (known on first
     render) — never from the media's measured natural ratio, which would
     make the box reshape after load. The box's pixel size is computed by
     the effect above; this string is only the pre-measurement fallback. */
  const mediaAspectStr = isPortrait ? '9/16' : '16/9';

  /* Flexible, viewport-height-driven hero spacing. The padding between the
     title block and the top bar, and between the columns and the bottom
     grey line, scales with the viewport (vh) within sane px bounds — so the
     hero stays balanced on a short laptop and a tall monitor alike. */
  const HERO_EDGE = 'clamp(1rem, 4vh, 3rem)';   // top & bottom padding to the edges
  const HERO_GAP  = 'clamp(1rem, 3vh, 2rem)';   // between title · media · columns

  /* Skeleton visibility: iframes report readiness via iframeReady, while
     <img>/<video> report via mediaLoaded. Hidden once ready or on error. */
  const mediaReady   = isYoutube || isVimeo ? iframeReady : mediaLoaded;
  const showSkeleton = !mediaReady && !iframeError;

  /* "About the video" / "About the image" — mirrors the project page's
     "About the Project" section heading. */
  const aboutHeading = `About the ${isImage ? 'image' : 'video'}`;

  /* Is there anything below the hero worth scrolling to? */
  const hasMore = Boolean(content.caption) || (content.contributors?.length ?? 0) > 0;

  /* Width for the top (title) and bottom (columns) rows: halfway between the
     media box and the full column, so on a narrow/portrait media they hug
     the media instead of stranding it in a sea of blank space, while a wide
     landscape media still lets them span the full column. */
  const metaMaxW = box ? Math.round((box.w + box.frameW) / 2) : undefined;

  /* Section-heading + body styles copied verbatim from the project detail
     page so this view matches its type hierarchy. */
  const sectionHeadingStyle: React.CSSProperties = {
    fontFamily: ty.fontFamily,
    fontSize:   ty.sizes.lg,                 // 32px
    fontWeight: ty.weights.bold,
    lineHeight: ty.lineHeights.heading,
    color:      cl.textPrimary,              // #000000
  };
  const bodyTextStyle: React.CSSProperties = {
    fontFamily: ty.fontFamily,
    fontSize:   ty.sizes.sm,                 // 18px
    fontWeight: ty.weights.regular,
    lineHeight: ty.lineHeights.body,
    color:      'rgb(55, 65, 81)',           // gray-700 — same as project body copy
  };

  /* ── RENDER ──────────────────────────────────────────────────────────── */
  /* Single-column layout at every breakpoint — desktop/tablet render the
     same stacked arrangement as mobile, just with a bit more breathing
     room in the outer gutters as the viewport grows. The whole page
     scrolls normally (no more fixed-height/overflow-hidden panels). */
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: ty.fontFamily }}>

      {/* ── Back to grid bar — sticky under the site header.
          Same translucent treatment + hairline bottom border as the site
          nav so the two bars read as one system. Its inner container mirrors
          the nav's (max-w-screen-xl · px-6) so "Back to grid" lines up with
          the brand name and the copy action lines up with the nav's right
          edge — not pinned to the raw viewport edges. */}
      <div
        className="sticky top-[80px] z-40 h-11 bg-white/95 backdrop-blur-sm"
        style={{ borderBottom: `1px solid ${cl.shadow}` }}
      >
        <div className="max-w-screen-xl mx-auto px-6 h-full flex items-center justify-between">
          <Link
            href="/portfolio/content"
            className="inline-flex items-center gap-1 font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
            style={{ fontSize: ty.sizes.xs }}
          >
            <ChevronLeft size={16} />
            Back to grid
          </Link>

          <button
            onClick={handleCopy}
            aria-label={copied ? 'Link copied' : 'Copy link'}
            className="inline-flex items-center gap-1.5 font-medium text-neutral-500 hover:text-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-md px-1"
            style={{ fontSize: ty.sizes.xs }}
          >
            {copied
              ? <Check size={15} color={cl.success[500]} />
              : <Copy size={15} />
            }
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
          </button>
        </div>
      </div>

      {/* ── Prev / Next — floating in the page gutters, never over content.
          Kept compact (and close to the edge) below lg so they stay within
          the body's side padding on phones and tablets; on lg+ the column
          centres and the arrows move out into the real gutter. */}
      <div className="flex fixed left-1 lg:left-6 top-1/2 -translate-y-1/2 z-40">
        <NavArrow direction="prev" slug={prevSlug} />
      </div>
      <div className="flex fixed right-1 lg:right-6 top-1/2 -translate-y-1/2 z-40">
        <NavArrow direction="next" slug={nextSlug} />
      </div>

      {/* ── SINGLE COLUMN BODY ──────────────────────────────────────────
          One column at every breakpoint (desktop/tablet look like mobile).
          Width matches the project detail page (max-w-3xl). A generous
          side padding (px-10) is held all the way to lg so the media/text
          always clears the compact edge arrows on phones AND tablets;
          only at lg+, where the column centres inside a wide gutter, does
          the padding relax and the arrows grow.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="px-10 lg:px-8 max-w-3xl mx-auto">

        {/* ── HERO — sized to exactly one viewport ─────────────────────
            height = viewport − site header (80) − this page's bar (44).
            A flex column: the media region flexes to fill whatever space
            the metadata leaves, so on first paint the whole hero fits the
            screen and the grey-lined "About" section sits just below the
            fold — regardless of screen size or content orientation. */}
        <div
          className="flex flex-col"
          style={{
            height:        'calc(100dvh - 124px)',
            paddingTop:    HERO_EDGE,   // flexible space down from the top bar
            paddingBottom: HERO_EDGE,   // flexible space up from the bottom grey line
            rowGap:        HERO_GAP,    // flexible space between the three rows
          }}
        >

          {/* ── TOP: title · type badge · date ─────────────────────────── */}
          {/* self-center + capped width so the row tracks the media instead
              of always spanning the whole column (see metaMaxW). */}
          <div
            className="animate-meta-enter shrink-0 self-center flex flex-col items-center w-full"
            style={{ maxWidth: metaMaxW }}
          >
            <h1
              className="text-center text-3xl md:text-4xl w-full"
              style={{
                fontWeight:    ty.weights.bold,   // bold, matching project titles/headings
                color:         cl.textPrimary,    // #000000
                fontFamily:    ty.fontFamily,
                letterSpacing: ty.letterSpacings.tight,
                lineHeight:    ty.lineHeights.heading,
                marginBottom:  sp.sm,
              }}
            >
              {content.title}
            </h1>

            {/* type badge + date on one line */}
            <div className="flex items-center justify-center flex-wrap" style={{ gap: sp.sm }}>
              {/* content-type tag — sharp outlined rectangle, blue token */}
              <span
                className="inline-flex items-center font-semibold uppercase flex-shrink-0 bg-white border border-primary-300 text-primary-700"
                style={{
                  gap:           sp.xxs,        // 4px
                  paddingLeft:   sp.sm,         // 16px
                  paddingRight:  sp.sm,
                  paddingTop:    sp.xxs,        // 4px
                  paddingBottom: sp.xxs,
                  borderRadius:  '6px',
                  fontSize:      ty.sizes.xxs,  // 12px
                  letterSpacing: ty.letterSpacings.wide,
                  fontFamily:    ty.fontFamily,
                }}
              >
                <span
                  className="bg-primary-500 flex-shrink-0"
                  style={{ width: '6px', height: '6px', borderRadius: '2px' }}
                />
                {content.content_type.name}
              </span>

              {/* separator dot */}
              <span
                style={{ width: '3px', height: '3px', borderRadius: '1px', background: cl.neutral[300], flexShrink: 0 }}
              />

              {/* date */}
              <span className="inline-flex items-center" style={{ gap: sp.xxs }}>
                <Calendar size={13} color={MUTED} style={{ flexShrink: 0 }} />
                <span
                  className="font-medium"
                  style={{ fontSize: ty.sizes.xxs, color: TEXT2, fontFamily: ty.fontFamily }}
                >
                  {fmtDate(dateStr)}
                </span>
              </span>
            </div>
          </div>

          {/* Media region — flexes; the box inside is JS-fitted to it */}
          <div
            ref={mediaFrameRef}
            className="flex-1 min-h-0 flex items-center justify-center"
          >
            {/* The media box: exact pixel size computed to fit the region,
                so it scales with the viewport and never overflows it. */}
            <div
              className="animate-media-enter relative overflow-hidden rounded-lg"
              style={{
                ...(box
                  ? { width: box.w, height: box.h }
                  : { height: '100%', aspectRatio: mediaAspectStr, maxWidth: '100%' }),
                boxShadow: sh.lifted,
              }}
            >

            {/* ── SKELETON ──────────────────────────────────────────────
                Fills the already-reserved box (same aspect-ratio as the
                final media) so nothing shifts when the media appears. */}
            {showSkeleton && (
              <div className="skeleton-shimmer absolute inset-0 z-10 rounded-lg" aria-hidden />
            )}

            {/* ── IMAGE ── */}
            {isImage && (
              <>
                <Image
                  ref={imgRef}
                  src={content.url}
                  alt={content.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  /* object-cover in-page: fill the whole box on both axes (no
                     letterbox bars) — the box already matches the content's
                     format ratio, so cropping is minimal. In fullscreen we
                     relax to object-contain so the whole image is visible. */
                  className={isFullscreen ? 'object-contain' : 'object-cover'}
                  style={{ background: cl.neutral[50] }}
                  onLoad={() => setMediaLoaded(true)}
                  onError={() => setMediaLoaded(true)}
                />
                {mediaLoaded && (
                  <button
                    onClick={handleFullscreen}
                    className="absolute top-3 right-3 z-20 flex items-center justify-center rounded-lg transition-all duration-150 hover:scale-105 focus:outline-none backdrop-blur-md"
                    style={{
                      width: sp.lg,    // 32px
                      height: sp.lg,
                      background: 'rgba(0,0,0,0.45)',
                    }}
                    aria-label="Fullscreen"
                  >
                    <Maximize2 size={15} color="#fff" />
                  </button>
                )}
              </>
            )}

            {/* ── DIRECT FILE (mp4 etc.) ── */}
            {isDirectFile && (
              <video
                src={content.url}
                className="w-full h-full rounded-lg"
                style={{
                  objectFit: 'cover',       // fill the box on both axes, no bars
                  background: cl.neutral[900],
                }}
                controls
                autoPlay
                onLoadedData={() => setMediaLoaded(true)}
                onError={() => setIframeError(true)}
              />
            )}

            {/* ── YOUTUBE ── */}
            {isYoutube && youtubeId && (
              <>
                {iframeError
                  ? <VideoError url={content.url} />
                  : (
                    <YouTube
                      videoId={youtubeId}
                      className="w-full h-full"
                      iframeClassName="w-full h-full rounded-lg"
                      opts={{
                        height: '100%',
                        width: '100%',
                        playerVars: {
                          autoplay: 1,
                          modestbranding: 1,
                          rel: 0,
                          start: youtubeStart,
                        },
                      }}
                      onReady={() => setIframeReady(true)}
                      onError={() => { setIframeError(true); setIframeReady(true); }}
                    />
                  )
                }
              </>
            )}

            {/* ── VIMEO ── */}
            {isVimeo && (
              <>
                {iframeError
                  ? <VideoError url={content.url} />
                  : (
                    <iframe
                      src={vimeoUrl ?? ''}
                      title={content.title}
                      className="w-full h-full rounded-lg"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      onLoad={() => setIframeReady(true)}
                      onError={() => { setIframeError(true); setIframeReady(true); }}
                    />
                  )
                }
              </>
            )}
          </div>
        </div>

          {/* ── BOTTOM: client · type · project ───────────────────────────
              Secondary supporting metadata, pinned to the bottom of the
              hero. Deliberately compact so it never competes with the
              title/media. Always a 3-column grid (at every breakpoint) with
              no dividers; label→value hierarchy preserved, value not bold. */}
          {content.project_info && (
            <div
              className="animate-meta-enter shrink-0 self-center w-full grid grid-cols-3 gap-3"
              style={{ maxWidth: metaMaxW }}
            >
              {[
                { label: 'Client',  value: content.project_info.client_name },
                { label: 'Type',    value: content.project_info.project_type_name },
                { label: 'Project', value: content.project_info.project_title || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center text-center">
                  <span
                    className="uppercase text-[10px] sm:text-[11px]"
                    style={{
                      fontFamily:    ty.fontFamily,
                      fontWeight:    ty.weights.regular,
                      letterSpacing: ty.letterSpacings.wide,
                      color:         cl.textSecondary,          // rgba(0,0,0,0.4)
                      marginBottom:  sp.xxs,                     // 4px
                    }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-sm sm:text-base"
                    style={{
                      fontFamily: ty.fontFamily,
                      fontWeight: ty.weights.medium,            // not bold anymore
                      color:      cl.neutral[800],              // #262626
                      lineHeight: ty.lineHeights.tight,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>{/* hero — end of the one-viewport section */}

        {/* Anchor for the "scroll for more" hint. scroll-mt clears the fixed
            header + sticky bar so the section lands just under them. */}
        <div ref={moreRef} className="scroll-mt-[124px]" aria-hidden />

        {/* ── ABOUT (caption) — first block below the fold. Its top border
            is the grey line that separates the hero from everything after. */}
        {content.caption && (
          <div
            className="w-full text-left border-t border-gray-100"
            style={{ paddingTop: sp.xl, paddingBottom: sp.lg }}
          >
            <h2 style={{ ...sectionHeadingStyle, marginBottom: sp.md }}>
              {aboutHeading}
            </h2>
            <p style={bodyTextStyle}>{content.caption}</p>
          </div>
        )}

        {/* ── CONTRIBUTORS — two-column table, Role · Name.
            Role on the left, name on the right. Columns are NOT separated;
            only the rows are divided by the same hairline gray rule. */}
        {content.contributors && content.contributors.length > 0 && (
          <div className="w-full text-left border-t border-gray-100" style={{ paddingTop: sp.xl, paddingBottom: sp.lg }}>
            <h2 style={{ ...sectionHeadingStyle, marginBottom: sp.md }}>
              Credits
            </h2>
            <table className="w-full border-collapse">
              <tbody>
                {content.contributors.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-b-0">
                    <td
                      className="py-3 pr-4 align-top"
                      style={{
                        fontSize:   ty.sizes.xs,     // 14px
                        fontWeight: ty.weights.regular,
                        color:      cl.neutral[500], // #737373 — muted role
                        fontFamily: ty.fontFamily,
                      }}
                    >
                      {c.role}
                    </td>
                    <td
                      className="py-3 pl-4 text-right align-top"
                      style={{
                        fontSize:   ty.sizes.xs,     // 14px
                        fontWeight: ty.weights.semibold,
                        color:      cl.neutral[900], // #171717 — name stands out
                        fontFamily: ty.fontFamily,
                      }}
                    >
                      {c.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>{/* body wrapper */}

      {/* ── SCROLL-FOR-MORE HINT — only when there's content past the hero,
          and only until the reader starts scrolling. Sits bottom-right, out
          of the way of the centred copy toast and the mid-height arrows.
          Clicking smooth-scrolls to the first below-the-fold section. */}
      {hasMore && !hasScrolled && (
        <button
          onClick={scrollToMore}
          aria-label="Scroll for more details"
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm px-3.5 py-2 text-primary-600 hover:text-primary-700 transition-colors"
          style={{ border: `1px solid ${cl.neutral[200]}`, boxShadow: sh.md, fontSize: ty.sizes.xs }}
        >
          <span className="hidden sm:inline font-medium">Scroll for details</span>
          <ChevronDown size={16} className="animate-bounce" />
        </button>
      )}

      {/* ── COPY TOAST — small, centred, self-dismissing ──────────────────
          Outer node owns the fixed centring; the inner node runs the
          fade-in/out animation so its transform never fights the centring
          transform. pointer-events-none keeps it from blocking clicks. */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
          <div
            className="animate-copied-fade-in flex items-center gap-2 rounded-lg bg-white px-4 py-2.5"
            style={{ border: `1px solid ${cl.neutral[200]}`, boxShadow: sh.lifted }}
          >
            <span
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: '18px', height: '18px', background: cl.success[500] }}
            >
              <Check size={12} color="#fff" strokeWidth={3} />
            </span>
            <span
              className="font-medium"
              style={{ fontSize: ty.sizes.xs, color: cl.neutral[800], fontFamily: ty.fontFamily }}
            >
              Link copied successfully
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
