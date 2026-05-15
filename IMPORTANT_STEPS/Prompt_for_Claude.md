**Role:** You are a Senior Principal Web Architect specializing in migrating high-traffic React SPAs (Vite) to Next.js 14+ App Router.

**Task:** Analyze the provided codebase and audit list to create a 10-20 phase "Master Migration Blueprint." This plan must ensure that the application remains functional at every stage and that no "cascading bugs" occur during the refactor.

**Core Constraints:**

1. **SEO:** Move from Netlify Edge Function hacks to native Next.js `generateMetadata`.
    
2. **Auth:** Transition from Client-side LocalStorage to `@supabase/ssr` with HTTP-only cookies and Middleware guards.
    
3. **Media:** Ensure `@ffmpeg/ffmpeg` and `browser-image-compression` never execute on the server.
    
4. **Infrastructure:** Preserve the Mega S4 cloud logic but move S3 presigning to Server Actions to hide credentials.
    
5. **Performance:** Implement SSG with On-Demand Revalidation via Webhooks for all Blog, Project, and Content pages.
    

**Blueprint Requirements per Phase:** For each phase, you must provide:

- **The Objective:** What specifically are we changing?
    
- **Dependency Impact:** Which existing files are affected and which new files are created?
    
- **Technical Translation:** Exactly how to translate specific logic (e.g., converting `useUrlFilters` from `react-router-dom` to `next/navigation`).
    
- **The "No-Break" Safety Check:** A specific testing procedure to verify this phase is complete before moving to the next.
    
- **Client/Server Boundary:** Explicitly state which components must have the `"use client"` directive.
    

**Structure your output as a chronological roadmap. Begin by auditing the current state, then move to the foundational architecture (Auth/Routing), then the UI migration, and finally the caching/optimization layer.**