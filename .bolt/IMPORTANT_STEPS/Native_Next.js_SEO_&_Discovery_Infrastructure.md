
1. **Purge Legacy SEO Hacks:** Completely discard `react-helmet-async`, the custom `src/components/SEO.tsx`, and all Netlify Edge Functions (`inject-blog-meta.ts`, `inject-blog-list-meta.ts`).
    
2. **Native Metadata API:** Implement the Next.js Metadata API. Use exported static `metadata` objects in `layout.tsx` and static pages (Home, Story). Use the `generateMetadata` function for all dynamic routes (`blog/[slug]`, `projects/[slug]`) to securely fetch Open Graph tags, Twitter Cards, and canonical URLs directly from the server.
    
3. **Native Sitemaps:** Deprecate the existing Supabase `generate-sitemap` edge function. Replace it with Next.js native `app/sitemap.ts` and `app/robots.ts` files to dynamically generate XML sitemaps leveraging the cached server data.
    
4. **Structured Data (JSON-LD):** The blueprint must include a phase to implement Schema.org JSON-LD natively inside Server Components (e.g., `Article` schema for blog posts, `Person` and `CollectionPage` schema for the portfolio).
    
5. **Core Web Vitals:** Ensure all heavy media assets are optimized. The plan must enforce the replacement of standard `<img>` tags with the `next/image` component for automatic WebP/AVIF conversion, layout shift prevention, and lazy loading.