import { SITE_NAME } from '../config/site';
import { extractTextFromTipTap } from '../utils/dataLoader';
import type { BlogPost } from '../utils/blogLoader';
import type { Content, Project } from '../types';
import type { Document } from '../types/documents';

/**
 * How each kind of row describes itself.
 *
 * These fallback chains were previously written out separately in the page, in
 * the short-link preview and (once cards arrived) in the card renderer. They
 * had already drifted once — a post with an empty excerpt showed its body text
 * on the page and the generic site description on the shared link. One
 * definition each, used by all three, is what stops that recurring.
 *
 * Raw text: callers pass the result through metaDescription() to collapse
 * whitespace and cut to their own length.
 */

export function postDescription(post: Pick<BlogPost, 'excerpt' | 'content'>): string {
  return post.excerpt || extractTextFromTipTap(post.content) || `Blog post by ${SITE_NAME}`;
}

export function projectDescription(
  project: Pick<Project, 'client_name'> & { project_type: { name: string } }
): string {
  return `${project.project_type.name} project for ${project.client_name}.`;
}

export function contentDescription(
  content: Pick<Content, 'caption'> & { content_type?: { slug: string } | null }
): string {
  const isVideo = content.content_type?.slug === 'video';
  return content.caption ?? `${isVideo ? 'Video' : 'Image'} by ${SITE_NAME}`;
}

export function documentDescription(doc: Pick<Document, 'title' | 'description'>): string {
  return doc.description || `${doc.title} — a document from ${SITE_NAME}`;
}
