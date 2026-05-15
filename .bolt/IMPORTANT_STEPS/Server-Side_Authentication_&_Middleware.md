Transition the authentication system from `localStorage` to **HTTP-only Cookies** and move route protection from the UI layer to the **Middleware** layer.

**Technical Specifications for the AI:**

- **Session Management:** Deprecate `window.localStorage` usage in `src/lib/supabase.ts`. Implement `@supabase/ssr` to create three distinct Supabase clients:
    
    1. **Server Client:** For fetching data in Server Components and generating SEO metadata.
        
    2. **Client Client:** For interactivity in components marked with `"use client"`.
        
    3. **Middleware Client:** For protecting routes.
        
- **Middleware Protection (The Perimeter):** Discard the `ProtectedRoute.tsx` component. Create a `middleware.ts` file in the project root. This middleware must:
    
    - Intercept all requests to `/admin`.
        
    - Verify the user's session using the Supabase cookie.
        
    - Redirect unauthorized users to `/admin/login` before the page even begins to render.
        
- **Auth Callback Route:** Create a route at `app/auth/callback/route.ts` to handle the PKCE flow (exchanging the code for a session) and setting the initial cookies.
    
- **Login Flow:** Refactor `src/pages/admin/AdminLoginPage.tsx` to use a **Server Action** or a standard client-side login that automatically updates the session cookies.
- 
The `middleware.ts` file MUST include a `config` object with a `matcher` array that strictly applies the middleware ONLY to `/admin/:path*` and explicitly ignores `/_next/`, `/images/`, `/favicon.ico`, and all public routes

All environment variables currently prefixed with `VITE_` must be renamed to `NEXT_PUBLIC_` across the entire codebase to expose them to Client Components. Server-only secrets (like Database Service Keys or S4 secret keys) must have NO prefix.