import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (REVALIDATE_SECRET && token !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { table?: string; record?: Record<string, unknown>; type?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const table = body.table;

  if (!table) {
    return NextResponse.json({ error: 'Missing table in payload' }, { status: 400 });
  }

  const revalidated: string[] = [];

  if (table === 'posts') {
    revalidatePath('/blog', 'page');
    revalidatePath('/blog/[slug]', 'page');
    revalidatePath('/sitemap.xml');
    revalidated.push('/blog', '/blog/[slug]', '/sitemap.xml');

    const slug = (body.record as any)?.slug;
    if (slug) {
      revalidatePath(`/blog/${slug}`, 'page');
      revalidated.push(`/blog/${slug}`);
    }
  }

  if (table === 'projects') {
    revalidatePath('/portfolio', 'page');
    revalidatePath('/portfolio/projects', 'page');
    revalidatePath('/portfolio/projects/[slug]', 'page');
    revalidatePath('/sitemap.xml');
    revalidated.push('/portfolio', '/portfolio/projects', '/portfolio/projects/[slug]', '/sitemap.xml');

    const slug = (body.record as any)?.slug;
    if (slug) {
      revalidatePath(`/portfolio/projects/${slug}`, 'page');
      revalidated.push(`/portfolio/projects/${slug}`);
    }
  }

  if (table === 'content') {
    revalidatePath('/portfolio/content', 'page');
    revalidatePath('/portfolio/content/[slug]', 'page');
    revalidatePath('/sitemap.xml');
    revalidated.push('/portfolio/content', '/portfolio/content/[slug]', '/sitemap.xml');

    const slug = (body.record as any)?.slug;
    if (slug) {
      revalidatePath(`/portfolio/content/${slug}`, 'page');
      revalidated.push(`/portfolio/content/${slug}`);
    }
  }

  if (table === 'documents') {
    revalidatePath('/documents/[slug]', 'page');
    revalidatePath('/sitemap.xml');
    revalidated.push('/documents/[slug]', '/sitemap.xml');

    const slug = (body.record as any)?.slug;
    if (slug) {
      revalidatePath(`/documents/${slug}`, 'page');
      revalidated.push(`/documents/${slug}`);
    }
  }

  if (revalidated.length === 0) {
    return NextResponse.json(
      { message: `No revalidation rules for table: ${table}` },
      { status: 200 }
    );
  }

  return NextResponse.json({ revalidated, now: Date.now() });
}
