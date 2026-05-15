## 🎯 Project Overview
We are migrating a production React SPA (Vite) to Next.js 14+ (App Router). The primary goals are flawless Technical SEO, extreme performance via Server-Side Site Generation (SSG), and maintaining our existing UI/UX and database schema.

## 🛠️ The Tech Stack
* **Framework:** Next.js 14+ (App Router, `src` directory)
* **Styling:** Tailwind CSS, Framer Motion
* **Database/Auth:** Supabase (`@supabase/ssr` with HTTP-only cookies)
* **Storage:** Mega S4 Cloud (S3 compatible)
* **Content:** TipTap Rich Text, Custom Video/Image compression, Youtube, Video Iframes

---

## 🛑 CORE ARCHITECTURAL CONSTRAINTS (NON-NEGOTIABLE)

### 1. The Server/Client Boundary
Next.js Server Components are the default. You must explicitly define `"use client"` at the top of the file ONLY when absolutely necessary.
* **Server Components (`page.tsx`, `layout.tsx`):** Used for all data fetching, SEO generation, and structural layouts.
* **Client Components (Requires `"use client"`):** Used ONLY for interactive UI (buttons, carousels), `framer-motion` animations, `react-dropzone`, and `@tiptap/react` rendering. 
* **CRITICAL:** Resource-intensive WASM libraries (`@ffmpeg/ffmpeg`, `browser-image-compression`) MUST be strictly quarantined to Client Components. Never execute them on the Node server.

### 2. Data Fetching & Caching Strategy
* **No Client Fetching:** Discard all `useEffect` + `useState` data loading patterns from the Vite era. 
* **Static Generation (SSG):** All dynamic routes (Blog, Projects, Content) must be fetched asynchronously on the server inside `page.tsx`.
* **On-Demand Revalidation:** Do NOT use `force-dynamic`. Pages must be statically cached. We will use Next.js `revalidatePath` triggered by Supabase Webhooks to update pages when database rows change.

### 3. Native SEO & Discovery
* **Purge Legacy Tools:** Do NOT use `react-helmet-async`, Netlify Edge Functions, or legacy Supabase sitemap generators.
* **Metadata API:** Use the native `generateMetadata` function in dynamic routes to inject Open Graph data, Canonical URLs, and titles directly into the server HTML.
* **Core Web Vitals:** Replace all standard `<img>` tags with Next.js `<Image>` (from `next/image`) for automatic WebP optimization and layout shift prevention.

### 4. Authentication & Middleware
* **Middleware First:** All `/admin` routes must be protected at the edge using Next.js `middleware.ts` to verify Supabase session cookies before rendering.
* **SSR Package:** Use `@supabase/ssr` exclusively. Do not rely on local storage for session management.

### 5. Mega S4 Cloud Security
* **Presigned URLs:** Generation of S3 presigned URLs must happen in a Next.js Server Action or Route Handler to protect `VITE_MEGA_S4_ACCOUNT_ID` and secret keys.
* **Direct Uploads:** The Next.js server acts ONLY as the authenticator. Heavy video/image uploads must stream directly from the user's browser to the S4 bucket to prevent Vercel/Netlify memory timeouts.

### 6. Absolute UI/UX Fidelity & Feature Parity
* **Pixel-Perfect Recreation:** For every single UI component and piece of layout, the visual output and user interaction must look and function *exactly, literally, exactly the same* as it did in the Vite application. 
* **Zero Feature Loss:** You must be extremely thorough and attentive when reading the original Vite code. Do not simplify, truncate, or eliminate *any* existing features, edge cases, error states, or user flows.
* **Styling Preservation:** Preserve all existing Tailwind classes and Framer Motion variants. If translating a component to Next.js requires structural changes (like separating a Server and Client component), the resulting user experience must remain completely indistinguishable from the original.


All environment variables currently prefixed with `VITE_` must be renamed to `NEXT_PUBLIC_` across the entire codebase to expose them to Client Components. Server-only secrets (like Database Service Keys or S4 secret keys) must have NO prefix.

---

## 🏗️ WORKFLOW PROTOCOL
When asked to write code or execute a phase of the migration, follow this sequence:
1.  **Acknowledge the Context:** Briefly state how the requested component fits into the Next.js architecture.
2.  **Define the Boundary:** Explicitly state if the new code is a Server or Client component.
3.  **Provide the Code:** Write the complete, production-ready code.
4.  **Safety Check:** Briefly explain the edge cases you avoided (e.g., "I added 'use client' here to prevent Framer Motion from crashing the server") and confirm that 100% feature parity was maintained.