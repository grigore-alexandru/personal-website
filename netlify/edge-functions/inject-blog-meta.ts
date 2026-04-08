import type { Config, Context } from "@netlify/edge-functions";
import { extractTextFromTipTap } from '../utils/dataLoader';

const SITE_NAME = "Alexandru Grigore";
const SITE_URL = "https://sweet-vacherin-65bc21.netlify.app";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

interface Post {
  title: string;
  excerpt: string | null;
  hero_image_large: string | null;
  published_at: string;
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url);

  const pathSegments = url.pathname.replace(/\/$/, "").split("/");
  const slug = pathSegments[pathSegments.length - 1];

  if (!slug || slug === "blog") {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type");

  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL");
  const supabaseKey = Netlify.env.get("VITE_SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[inject-blog-meta] Missing Supabase env vars");
    return response;
  }

  try {
    const fetchUrl = `${supabaseUrl}/rest/v1/posts?slug=eq.${encodeURIComponent(slug)}&is_draft=eq.false&select=title,excerpt,hero_image_large,published_at&limit=1`;

    const dbResponse = await fetch(fetchUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!dbResponse.ok) {
      console.error("[inject-blog-meta] DB fetch failed:", dbResponse.status);
      return response;
    }

    const posts: Post[] = await dbResponse.json();

    if (!posts || posts.length === 0) {
      return response;
    }

    const post = posts[0];

    const rawTitle = post.title || "Blog Post";
    const resolvedTitle = escapeAttr(`${rawTitle} | ${SITE_NAME}`);
    const resolvedDescription = escapeAttr(post.excerpt || "");
    const resolvedImage = post.hero_image_large
      ? escapeAttr(post.hero_image_large)
      : DEFAULT_OG_IMAGE;
    const resolvedCanonical = escapeAttr(`${SITE_URL}/blog/${slug}`);

    const structuredData = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: rawTitle,
      description: post.excerpt || extractTextFromTipTap(post.content).slice(0,160).trim() || undefined,
          image: post.heroImageLarge ?? undefined,,
      image: post.hero_image_large || undefined,
      url: `${SITE_URL}/blog/${slug}`,
      datePublished: post.published_at,
      author: { "@type": "Organization", name: "Cinematic Studio" },
    });

    const metaTags = `
    <title>${resolvedTitle}</title>
    <meta name="description" content="${resolvedDescription}" />
    <link rel="canonical" href="${resolvedCanonical}" />
    <meta property="og:title" content="${resolvedTitle}" />
    <meta property="og:description" content="${resolvedDescription}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${resolvedCanonical}" />
    <meta property="og:image" content="${resolvedImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="${escapeAttr(SITE_NAME)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${resolvedTitle}" />
    <meta name="twitter:description" content="${resolvedDescription}" />
    <meta name="twitter:image" content="${resolvedImage}" />
    <script type="application/ld+json">${structuredData}</script>`;

    let html = await response.text();

    html = html.includes("<title>")
      ? html.replace(/<title>[^<]*<\/title>/, "")
      : html;

    const headOpeningTag = "<head>";
    if (html.includes(headOpeningTag)) {
      html = html.replace(headOpeningTag, `${headOpeningTag}\n${metaTags}`);
    } else {
      html = `<head>\n${metaTags}\n</head>\n${html}`;
    }

    return new Response(html, {
      status: response.status,
      headers: response.headers,
    });
  } catch (err) {
    console.error("[inject-blog-meta] Error:", err);
    return response;
  }
}

export const config: Config = {
  path: "/blog/*",
};
