### 1. The Heavyweight: `MediaCompressor.tsx` - COMPLETELY REMOVE IT

### 2. The Browser-Dependent Editors: `RichTextEditor.tsx` & `TipTapRenderer.tsx`

- **The Reason (`RichTextEditor`): Text editors rely heavily on the browser's `document` and `window` APIs to measure text, handle selections, and manage focus. Next.js server-side rendering doesn't have a `window`, so the editor will often throw hydration errors if not dynamically loaded.
    
- **The Reason (`TipTapRenderer`):** It uses `DOMPurify`. Standard DOMPurify requires the browser DOM to sanitize HTML. If it runs on the server, it will throw a `window is not defined` error (unless you use a specific isomorphic workaround).
    
TypeScript

```
const RichTextEditor = dynamic(
  () => import('@/components/forms/RichTextEditor').then(mod => mod.RichTextEditor),
  { ssr: false } 
);

const TipTapRenderer = dynamic(
  () => import('@/components/project/TipTapRenderer'),
  { ssr: false } // Bypasses the DOMPurify server error
);
```

### 3. The Off-Screen Media: `GalleryModal.tsx`
- **The Strategy:** There is no reason to force the user to download the YouTube Iframe API and animation libraries just to read the project description. Dynamic loading defers this download until the exact moment the modal is triggered.
    
- **How to import it (inside your Project Page):**
    
TypeScript

```
const GalleryModal = dynamic(
  () => import('@/components/project/GalleryModal'),
  // We CAN allow SSR here if we want, but deferring the JS payload is the goal
  { loading: () => <div className="fixed inset-0 bg-black/90" /> }
);

// In your component:
{isGalleryOpen && <GalleryModal items={items} onClose={close} />}
```

### 4. Admin Pages (Route-Level Code Splitting)

Looking at your file tree, you have an entire `/admin` folder (`ContentManagementPage.tsx`, `BulkUploadPage.tsx`, etc.).

- **The Strategy:** In Next.js App Router (`app/admin/...`), Next.js automatically code-splits by route. Visitors to your public portfolio will **never** download the code for `BulkUploadPage.tsx` or your Admin Layout.
    
- **Your Action Item:** You don't need manual `next/dynamic` for the pages themselves. Just put them in the `app/admin/`directory, and Next.js handles the isolation automatically.
    