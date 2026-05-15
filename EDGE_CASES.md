### DATA VALIDATION    
In the current Vite setup, data validation runs entirely in the browser. Moving to Next.js, especially when adopting Server Actions or API Routes for database mutations, mandates robust dual-layer validation.

Potential Problem: Relying solely on client-side validation exposes Next.js backend endpoints to malicious payloads, as Server Actions and Route Handlers can be invoked directly via HTTP requests outside the standard UI flow.

Edge Case: Mismatched validation schemas between the client and server. If the client-side UI allows a text input of 1.000 characters but the server-side validation strictly expects a maximum of 500,00 characters, it will lead to unhandled server errors during hydration or form submission, degrading the user experience.

### MEGA S3 CLOUD INTEGRATION
Potential Problem: Importing and using the AWS SDK inside a Client Component in Next.js will expose AWS secret access keys directly to the browser, leading to critical security breaches. The SDK execution must be strictly confined to server-side environments.

Edge Case: Handling file uploads larger than 5.000,00 MB using Next.js API routes as data proxies will consume excessive server RAM and hit memory/timeout limits on hosting platforms. The migration must ensure that Next.js is only utilized to generate the presigned URL, while the actual heavy upload stream is executed directly from the browser to the S3 bucket.

### SUPABASE INTEGRATION
Potential Problem: Real-time subscriptions provided by Supabase cannot be established inside Server Components. All WebSocket connections must be migrated exclusively to isolated Client Components.

Edge Case: Hydration mismatches during initial load. If a Next.js Server Component reads a stale cookie and renders a logged-in state, but the client-side Supabase instance initializes slower, verifies the token against the Supabase server, finds it invalid, and forces a logout, the UI will exhibit severe visual flickering and layout shifts due to DOM discrepancies between the server payload and client state.

### AUTHENTICATION
The migration of the Admin dashboard requires shifting from client-side route guards to Next.js Edge Middleware.

Potential Problem: Accessing Supabase sessions inside Next.js middleware adds compute latency to every single route request across the entire application, potentially impacting Time to First Byte.

Edge Case: Session expiry and token refresh handling during Server-Side Rendering. If an access token expires right at the millisecond a user requests a protected page, the Next.js server might fail to fetch data before the client-side SDK has a chance to negotiate a refresh token. This results in a hard 401 error displayed to a returning user instead of a seamless background token refresh.

### FILTERING SYSTEMS
The provided useUrlFilters.ts hook relies entirely on react-router-dom. This is fundamentally incompatible with the Next.js App Router and must be rewritten using next/navigation hooks.

Potential Problem: Shifting from client-side array filtering to server-side URL-based filtering alters the performance profile. Every URL query parameter change will trigger a server request to re-render the page component.

Edge Case: Inefficient database queries and server overload. If a user rapidly clicks multiple filter checkboxes, and the client application does not debounce the router update calls, the Next.js server will be overwhelmed with simultaneous rendering and database requests, potentially exceeding 1.000,00 query executions per minute for a single active user.

### INTERACTIONS BREAKING
The existing Vite project heavily utilizes framer-motion, tiptap, and react-dropzone. These libraries rely entirely on browser APIs that do not exist on the server.

Potential Problem: Next.js attempts to render all components on the server first. Any component importing these DOM-dependent libraries without the explicit "use client" directive at the top of the file will fail during the build process or throw runtime errors.

Edge Case: Client-side JavaScript execution errors due to SSR mismatch with the Tiptap rich text editor. Rich text parsers often generate slightly different HTML node structures based on the execution environment. If the server renders the raw HTML string from Supabase differently than Tiptap attempts to hydrate it on the client, it will completely break the interaction, causing Next.js to log severe hydration errors and potentially strip all CSS styling or user content from the editor window.

### MIGRATION STRATEGY AND RECOMMENDATIONS
A structured, phased migration is strictly required to mitigate systemic failures.

a. Dependency Audit: Isolate purely client-side packages into dedicated wrapper components heavily guarded by "use client" directives and utilize Next.js dynamic imports with SSR explicitly disabled. b. Rewrite Routing Hooks: Immediately discard react-router-dom hooks. Rewrite useUrlFilters.ts using next/navigation logic before migrating any UI components to ensure URL synchronization works in the new router. c. Authentication Layer First: Implement the cookie-based Supabase SSR package and establish Next.js middleware first, ensuring the Admin routes are robustly secured at the edge before migrating the visual admin interface. d. Data Fetching Conversion: Convert all useEffect-based data fetching from Vite to native asynchronous awaits inside Next.js Server Components to leverage the framework's caching mechanisms.

### On-Demand Revalidation (Webhooks)

Since your app has an **Admin Panel** (I saw your `BlogCreateForm.tsx` and `ProjectCreateForm.tsx`), you can make updates **instant**without any server waste.

- **How it works:** When you click "Save" in your Admin Panel, your code sends a tiny "ping" to Next.js saying: _"Hey, I just updated the blog. Refresh the cache for `/blog` and `/blog/my-new-post` right now."_
    
- **The Result:** The change is instant for users, but the page remains "Static" (fast and cheap) for everyone else. You only "pay" for a rebuild exactly when you actually change something.
	- Supabase webhook configuration
		- Go to **Database** -> **Webhooks**.
		    
		- Click **Create Webhook**.
		    
		- Name it "Update Next.js Cache".
		    
		- Select the tables (`blog_posts`, `projects`, `content`).
		    
		- Choose the events: `Insert`, `Update`, `Delete`.
		    
		- Under Webhook Configuration, enter your Next.js API URL: `https://yourwebsite.com/api/revalidate`
		    
		- Add an HTTP Header: `Authorization: Bearer YOUR_SECRET_TOKEN` (which Claude will help you generate).

### Refactor Module: URL-Driven Server-Side Filtering

**Current Implementation (Vite):** The application currently uses `react-router-dom` and a custom `useUrlFilters.ts` hook to manage state in the browser. Filtering is performed by fetching all items and using client-side JavaScript to filter an array held in `useState`.

**New Requirement (Next.js App Router):** Transition the filtering logic from **Client-Side State** to **Server-Side URL Source of Truth**.

**Technical Specifications for the AI:**

- **Source of Truth:** The URL `searchParams` is now the global state.
    
- **Page-Level Fetching:** The parent Server Component (e.g., `app/portfolio/projects/page.tsx`) must receive the `searchParams` prop natively from Next.js. Use these parameters to construct a specific Supabase query (e.g., `.eq('category', searchParams.category)`) so that only the filtered data is sent from the server.
    
- **Component Boundary (Client):** The `SearchBar` and `CustomDropdown` components must remain as `"use client"`.
    
- **Navigation Logic:** Replace all `useSearchParams` logic from `react-router-dom` with `useSearchParams`, `usePathname`, and `useRouter` from `next/navigation`.
    
- **Interaction Flow:**
    
    1. User interacts with a `CustomDropdown` (Client Component).
        
    2. The component updates the URL using `router.push()` or `router.replace()`.
        
    3. Next.js detects the URL change and triggers a server-side re-render of the Page.
        
    4. The Page fetches the new, specific data from Supabase and streams the updated UI back to the browser.
        
- **Elimination of Redundancy:** Completely remove `useState` and `useEffect` hooks previously used to store or filter project/blog arrays.