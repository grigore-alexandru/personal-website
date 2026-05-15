my-personal-website/
├── public/                 # Static assets (images, fonts, robots.txt)
│   ├── robots.txt          # Kept exactly as your old one
│   └── ...
│
├── src/
│   ├── app/                # 🚀 THE NEW ROUTER (Replaces src/pages)
│   │   ├── layout.tsx      # Replaces your PublicLayout/App wrapper. Includes Header/Footer.
│   │   ├── page.tsx        # Previously: src/pages/HomePage.tsx (Server Component)
│   │   │
│   │   ├── story/
│   │   │   └── page.tsx    # Previously: src/pages/StoryPage.tsx
│   │   │
│   │   ├── portfolio/
│   │   │   └── page.tsx    # Previously: src/pages/PortfolioLandingPage.tsx
│   │   │   │
│   │   │   ├── projects/    # 📂 /portfolio/projects
│   │   │   │   ├── page.tsx # 📍 ProjectsListPage.tsx # Previously: src/pages/ProjectsListPage.tsx
│   │   │   │   └── [slug]/  # 📂 /portfolio/projects/your-project-slug ⚡ DYNAMIC ROUTE
│   │   │   │       └── page.tsx # 📍 ProjectDetailPage.tsx
│   │   │   │
│   │   │   └── content/     # 📂 /portfolio/content
│   │   │       ├── page.tsx # 📍 ContentPortfolioPage.tsx 
│   │   │       └── [slug]/  # 📂 /portfolio/content/your-content-slug ⚡ DYNAMIC ROUTE
│   │   │           └── page.tsx # 📍 ContentDetailPage.tsx
│   │   │
│   │   ├── blog/
│   │   │   ├── page.tsx    # Previously: src/pages/BlogListPage.tsx
│   │   │   └── [slug]/     # ⚡ DYNAMIC ROUTE
│   │   │       └── page.tsx# Previously: src/pages/BlogPostPage.tsx (Flawless SEO here)
│   │   │
│   │   └── admin/          # 🔒 SECURE ADMIN AREA
│   │       ├── layout.tsx  # Admin layout with Sidebar/AdminHeader. Checks Supabase Auth.
│   │       ├── login/
│   │       │   └── page.tsx# Previously: src/pages/admin/AdminLoginPage.tsx
│   │       ├── page.tsx    # Previously: src/pages/admin/AdminDashboardPage.tsx
│   │       ├── blog/
│   │       │   ├── page.tsx# Previously: src/pages/admin/BlogManagementPage.tsx
│   │       │   └── create/
│   │       │       └── page.tsx # Previously: BlogCreateForm.tsx
│   │       ├── projects/
│   │       │   ├── page.tsx# Previously: PortfolioManagementPage.tsx
│   │       │   └── create/
│   │       │       └── page.tsx # Previously: ProjectCreateForm.tsx
│   │       └── bulk-upload/
│   │           └── page.tsx# Previously: BulkUploadPage.tsx
│   │
│   ├── components/         # 🧩 YOUR UI BLOCKS (Copied directly from Vite)
│   │   ├── ui/             # Buttons, Toasts, Skeletons, Tooltips
│   │   ├── forms/          # CustomDropdown, RichTextEditor, FormatToggle
│   │   ├── project/        # ProjectGrid, MediaCarousel, TipTapRenderer
│   │   ├── admin/          # AdminHeader, ContentBrowser, AdminCards
│   │   └── ...             # Header.tsx, SEO.tsx (SEO might become obsolete, see notes)
│   │
│   ├── hooks/              # 🪝 REACT HOOKS
│   │   └── ...             # useAuth, useToast, useUrlFilters
│   │
│   ├── lib/                # 🛠️ CORE CONFIGURATION
│   │   ├── supabase/       # NEW: Separated Supabase clients
│   │   │   ├── client.ts   # For fetching data in Client Components (e.g., interactive buttons)
│   │   │   └── server.ts   # For fetching data in Server Components (e.g., SEO, page loading)
│   │   └── s4.ts
│   │
│   ├── utils/              # 🧮 HELPER FUNCTIONS
│   │   └── ...             # slugify, dateUtils, markdownToHtml
│   │                       # Note: Loaders (blogLoader.ts) will be integrated directly into app/ routes!
│   │
│   ├── types/              # 🏷️ TYPESCRIPT DEFINITIONS
│   │   └── ...             # database.ts, index.ts
│   │
│   └── styles/             # 🎨 GLOBAL STYLES
│       ├── globals.css     # Previously: src/index.css
│       └── tokens.ts
│
├── tailwind.config.js      # Copied from your Vite project
├── next.config.js          # Replaces vite.config.ts
└── package.json            # New Next.js dependencies


Any global Context Providers (like Theme, Toast, or Auth states needed by the UI) must be abstracted into a separate `<Providers>` component marked with `"use client"`. The root `layout.tsx` (Server Component) will import and wrap `children` in this `<Providers>` component.
