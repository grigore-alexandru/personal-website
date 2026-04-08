import type { Config, Context } from "@netlify/edge-functions";

interface BlogPost {
  title: string;
  excerpt: string;
  hero_image: string;
}

export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url);
  
  // 1. Extract the slug
  const pathSegments = url.pathname.replace(/\/$/, '').split('/');
  const slug = pathSegments[pathSegments.length - 1];

  if (!slug || slug === 'blog') {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('text/html')) {
    return response;
  }

  // Access environment variables safely
  const supabaseUrl = Netlify.env.get('VITE_SUPABASE_URL');
  const supabaseKey = Netlify.env.get('VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase configuration in environment variables.");
    return response;
  }

  try {
    // 2. Fetch data using the REST API
    const fetchUrl = `${supabaseUrl}/rest/v1/blog_posts?slug=eq.${slug}&select=title,excerpt,hero_image&limit=1`;
    
    const dbResponse = await fetch(fetchUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!dbResponse.ok) return response;

    const posts: BlogPost[] = await dbResponse.json();
    
    if (!posts || posts.length === 0) {
      return response;
    }

    const post = posts[0];
    
    // 3. Generate meta tags
    const title = (post.title || 'Blog Post').replace(/"/g, '&quot;');
    const description = (post.excerpt || '').replace(/"/g, '&quot;');
    const imageUrl = post.hero_image 
      ? `${supabaseUrl}/storage/v1/object/public/blog-images/${post.hero_image}` 
      : '';
    const pageUrl = request.url;

    const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    `;

    // 4. Transform response
    let html = await response.text();
    const headOpeningTag = '<head>';
    
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
    console.error("Edge Function Error:", err);
    return response;
  }
}

// Netlify-specific config export
export const config: Config = {
  path: "/blog/*"
};