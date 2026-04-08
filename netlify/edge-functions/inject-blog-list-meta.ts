import type { Config, Context } from "@netlify/edge-functions";

const SITE_NAME = "Alexandru Grigore";
const SITE_URL = "https://sweet-vacherin-65bc21.netlify.app";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;
const BASE_DESCRIPTION = "Articles, insights, and behind-the-scenes stories from the studio.";

interface Post {
  title: string;
  excerpt: string | null;
  hero_image_large: string | null;
  tags: string[] | null;
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url);

  if (url.pathname.replace(/\/$/, "") !== "/blog") {
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
    console.error("[inject-blog-list-meta] Missing Supabase env vars");
    return response;
  }

  const tagParam = url.searchParams.get("tag") || url.searchParams.get("q") || null;

  try {
    let resolvedTitle: string;
    let resolvedDescription: string;
    let resolvedImage = DEFAULT_OG_IMAGE;
    const resolvedCanonical = tagParam
      ? escapeAttr(`${SITE_URL}/blog?tag=${encodeURIComponent(tagParam)}`)
      : escapeAttr(`${SITE_URL}/blog`);

    if (tagParam) {
      const tagLabel = capitalize(tagParam);

      const fetchUrl = `${supabaseUrl}/rest/v1/posts?is_draft=eq.false&select=title,excerpt,hero_image_large,tags&order=published_at.desc&limit=20`;

      const dbResponse = await fetch(fetchUrl, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      let matchingPosts: Post[] = [];

      if (dbResponse.ok) {
        const allPosts: Post[] = await dbResponse.json();
        const query = tagParam.toLowerCase();
        matchingPosts = allPosts.filter(
          (p) =>
            p.tags && p.tags.some((t) => t.toLowerCase().includes(query))
        );
      }

      resolvedTitle = escapeAttr(`${tagLabel} | Blog | ${SITE_NAME}`);
      resolvedDescription = escapeAttr(
        matchingPosts.length > 0
          ? `${matchingPosts.length} post${matchingPosts.length !== 1 ? "s" : ""} tagged with "${tagLabel}". ${BASE_DESCRIPTION}`
          : `Posts tagged with "${tagLabel}". ${BASE_DESCRIPTION}`
      );

      const firstWithImage = matchingPosts.find((p) => p.hero_image_large);
      if (firstWithImage?.hero_image_large) {
        resolvedImage = escapeAttr(firstWithImage.hero_image_large);
      }
    } else {
      resolvedTitle = escapeAttr(`Blog | ${SITE_NAME}`);
      resolvedDescription = escapeAttr(BASE_DESCRIPTION);
    }

    const structuredData = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: `Blog | ${SITE_NAME}`,
      description: BASE_DESCRIPTION,
      url: `${SITE_URL}/blog`,
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    });

    const metaTags = `
    <title>${resolvedTitle}</title>
    <meta name="description" content="${resolvedDescription}" />
    <link rel="canonical" href="${resolvedCanonical}" />
    <meta property="og:title" content="${resolvedTitle}" />
    <meta property="og:description" content="${resolvedDescription}" />
    <meta property="og:type" content="website" />
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
    console.error("[inject-blog-list-meta] Error:", err);
    return response;
  }
}

export const config: Config = {
  path: "/blog",
};
