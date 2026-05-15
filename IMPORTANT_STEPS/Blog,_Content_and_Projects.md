### 1. The Projects (`/portfolio/projects/[slug]`)

**Your old file:** `src/pages/ProjectDetailPage.tsx`

**Your new file:** `src/app/portfolio/projects/[slug]/page.tsx`

- **The Client Boundary:** The Project detail pages are highly interactive. I use components like `MediaCarousel.tsx`, `GalleryModal.tsx`, and `ProjectNavigation.tsx`. You must ensure that the main page is a **Server Component** (to fetch the project data from Supabase), but it must add the `"use client"` directive to the top of the Carousel and Modal components.
    
- **Framer Motion:** You must isolate those animations into Client Components. Next.js Server Components will crash if they try to render framer-motion directly.
    
- **Prop Drilling:** Fetch the `project` object on the server and pass it as a static prop to the client components (e.g., `<MediaCarousel media={project.media} />`).

### 2. The Blog (`/blog/[slug]`)

**Your old file:** `src/pages/BlogPostPage.tsx`

**Your new file:** `src/app/blog/[slug]/page.tsx`

The BlogPostPage must fetch the raw HTML string from Supabase on the server. If we use the `TipTapRenderer` to display the post, that renderer MUST be a Client Component. 
    
**SEO Metadata:** This is the most important page for SEO. You must use the `generateMetadata` function to pull the blog post's `excerpt` as the meta description and the `hero_image_url` for the Open Graph (Social Media) image.

- **For the Admin Editor:** Use TipTap with `{ ssr: false }`.
    
- **For the Public Blog Page:** DO NOT use TipTap components. You must instruct take the raw HTML string saved in Supabase and render it directly on the server using React's `<div dangerouslySetInnerHTML={{ __html: post.content }} />`.

### 3. The Content (`/portfolio/content/[slug]`)

**Your old file:** `src/pages/ContentPortfolioPage.tsx` and `src/components/content/ContentDetailModal.tsx`

**Your new file:** `src/app/portfolio/content/[slug]/page.tsx`

**What Claude MUST take into consideration:**

- **The Modal Architecture:** Looking at your files, you have a `ContentDetailModal.tsx`. In Vite, if a user goes to `/portfolio/content/my-video`, your app likely loads the whole content grid and pops a modal over it.
    
- "In the old app, content details opened in a modal over the grid. For Next.js, please implement this using Next.js 'Intercepting Routes' and 'Parallel Routes' (the `@modal` folder pattern) so that it still looks like a modal when clicked from the grid, but works as a standalone SEO page if someone refreshes the browser."_
    
- **Video Handling:** Ensure that video players (like `react-youtube`) are Client Components.

