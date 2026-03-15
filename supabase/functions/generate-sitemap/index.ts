import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://sweet-vacherin-65bc21.netlify.app";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [projectsRes, postsRes, contentRes] = await Promise.all([
      supabase
        .from("projects")
        .select("slug, title, client_name, hero_image_large, updated_at")
        .eq("is_draft", false)
        .order("updated_at", { ascending: false }),
      supabase
        .from("posts")
        .select("slug, title, excerpt, hero_image_large, updated_at")
        .eq("is_draft", false)
        .order("updated_at", { ascending: false }),
      supabase
        .from("content")
        .select("id, title, caption, thumbnail, created_at")
        .not("thumbnail", "is", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const projects = projectsRes.data ?? [];
    const posts = postsRes.data ?? [];
    const contentItems = contentRes.data ?? [];

    const staticPages = [
      { url: SITE_URL, changefreq: "weekly", priority: "1.0", lastmod: new Date().toISOString().split("T")[0] },
      { url: `${SITE_URL}/portfolio`, changefreq: "weekly", priority: "0.9", lastmod: new Date().toISOString().split("T")[0] },
      { url: `${SITE_URL}/work`, changefreq: "weekly", priority: "0.9", lastmod: new Date().toISOString().split("T")[0] },
      { url: `${SITE_URL}/blog`, changefreq: "weekly", priority: "0.8", lastmod: new Date().toISOString().split("T")[0] },
    ];

    let urlEntries = "";

    for (const page of staticPages) {
      urlEntries += `
  <url>
    <loc>${escapeXml(page.url)}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    for (const project of projects) {
      const pageUrl = `${SITE_URL}/portfolio/project/${escapeXml(project.slug)}`;
      const lastmod = project.updated_at
        ? new Date(project.updated_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      urlEntries += `
  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>`;

      if (project.hero_image_large) {
        const imageTitle = escapeXml(project.title);
        const imageCaption = escapeXml(`${project.title} — ${project.client_name}`);
        urlEntries += `
    <image:image>
      <image:loc>${escapeXml(project.hero_image_large)}</image:loc>
      <image:title>${imageTitle}</image:title>
      <image:caption>${imageCaption}</image:caption>
    </image:image>`;
      }

      urlEntries += `
  </url>`;
    }

    for (const post of posts) {
      const pageUrl = `${SITE_URL}/blog/${escapeXml(post.slug)}`;
      const lastmod = post.updated_at
        ? new Date(post.updated_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      urlEntries += `
  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>`;

      if (post.hero_image_large) {
        const imageTitle = escapeXml(post.title);
        const imageCaption = post.excerpt
          ? escapeXml(post.excerpt)
          : imageTitle;
        urlEntries += `
    <image:image>
      <image:loc>${escapeXml(post.hero_image_large)}</image:loc>
      <image:title>${imageTitle}</image:title>
      <image:caption>${imageCaption}</image:caption>
    </image:image>`;
      }

      urlEntries += `
  </url>`;
    }

    for (const item of contentItems) {
      const thumbnail = item.thumbnail as { poster?: string } | null;
      const posterUrl = thumbnail?.poster;
      if (!posterUrl) continue;

      const imageTitle = escapeXml(item.title);
      const imageCaption = item.caption ? escapeXml(item.caption) : imageTitle;

      urlEntries += `
  <url>
    <loc>${escapeXml(`${SITE_URL}/work`)}</loc>
    <image:image>
      <image:loc>${escapeXml(posterUrl)}</image:loc>
      <image:title>${imageTitle}</image:title>
      <image:caption>${imageCaption}</image:caption>
    </image:image>
  </url>`;
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>${urlEntries}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("Sitemap generation error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate sitemap" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
