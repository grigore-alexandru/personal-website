import { PAGE_CARDS, isItemCardType, type ItemCardType } from '../../../../../config/pageCards';
import { metaDescription } from '../../../../../config/site';
import { renderCard } from '../../../../../lib/og/renderCard';
import {
  postDescription,
  projectDescription,
  contentDescription,
  documentDescription,
} from '../../../../../lib/itemMeta';
import { loadPost, loadAllPosts } from '../../../../../utils/blogLoader';
import { loadProject, loadProjects } from '../../../../../utils/dataLoader';
import {
  loadContentBySlug,
  loadPublishedContentWithProjects,
} from '../../../../../utils/contentService';
import { getDocumentBySlug, listDocuments } from '../../../../../utils/documentsService';

/**
 * A card carrying one post's or project's own title, for rows that have no
 * image: /og/item/blog/my-post.
 *
 * A row WITH an image never reaches here — the page points og:image at the /og
 * transform of that image instead. This route only exists for the gap.
 *
 * `force-static` with `dynamicParams` left ON is deliberate. The rows without
 * an image at build time are prerendered below, so the common case is a static
 * file. But a post published later must not ship a broken og:image, and its
 * card path cannot exist yet — so an unknown slug is rendered on demand and
 * then cached like any other static output. A slug that is not in the database
 * is a 404, which is what keeps the route from drawing arbitrary text.
 *
 * Titles change, and Facebook caches an og:image by URL indefinitely, so the
 * URL carries the row's updated_at (see itemCardUrl) and a retitled post
 * therefore gets a new one. src/app/api/revalidate also purges these paths.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-static';

/** Only the rows that have no image of their own — the rest never link here. */
export async function generateStaticParams() {
  const [posts, projects, content, documents] = await Promise.all([
    loadAllPosts(200, 0),
    loadProjects(200, 0),
    loadPublishedContentWithProjects(200, 0),
    listDocuments(),
  ]);

  return [
    ...posts.filter((p) => !p.heroImageLarge).map((p) => ({ type: 'blog', slug: p.slug })),
    ...projects.filter((p) => !p.hero_image_large).map((p) => ({ type: 'projects', slug: p.slug })),
    ...content
      .filter((c) => !(c.thumbnail && 'poster' in c.thumbnail && c.thumbnail.poster))
      .map((c) => ({ type: 'content', slug: c.slug })),
    ...documents.filter((d) => !d.thumbnailUrl).map((d) => ({ type: 'documents', slug: d.slug })),
  ];
}

/** Title + description for a row, or null when there is no such row. */
async function loadItem(
  type: ItemCardType,
  slug: string
): Promise<{ title: string; description: string } | null> {
  switch (type) {
    case 'blog': {
      const post = await loadPost(slug);
      return post && { title: post.title, description: postDescription(post) };
    }
    case 'projects': {
      const project = await loadProject(slug);
      return project && { title: project.title, description: projectDescription(project) };
    }
    case 'content': {
      const content = await loadContentBySlug(slug);
      return content && { title: content.title, description: contentDescription(content) };
    }
    case 'documents': {
      const doc = await getDocumentBySlug(slug);
      return doc && { title: doc.title, description: documentDescription(doc) };
    }
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { type: string; slug: string } }
) {
  if (!isItemCardType(params.type)) return new Response('Unknown card type', { status: 404 });

  const item = await loadItem(params.type, decodeURIComponent(params.slug));
  if (!item) return new Response('Not found', { status: 404 });

  const section = PAGE_CARDS[params.type];

  return renderCard({
    // The section name, so the card still says which part of the site this is.
    eyebrow: section.title,
    title: item.title,
    description: metaDescription(item.description, section.description),
    icon: section.icon,
    // The section path, not the item's: a full slug would overrun the column,
    // and the title above already identifies the page.
    path: section.path,
  });
}
