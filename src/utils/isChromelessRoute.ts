/**
 * Routes that render without the site header and its 80px top offset.
 *
 * `/admin` is the admin panel, which brings its own header. `/r` is the short-
 * link redirector: an interstitial animation or a dead-link notice, both of
 * which are meant to fill the viewport on their own. `/documents` is the PDF
 * viewer: it brings its own sticky toolbar (with Website/Contact links
 * standing in for site nav), and stacking that under the fixed global header
 * would waste vertical space and double up navigation.
 */
export function isChromelessRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith('/admin') ||
    pathname === '/r' ||
    pathname.startsWith('/r/') ||
    pathname === '/documents' ||
    pathname.startsWith('/documents/')
  );
}
