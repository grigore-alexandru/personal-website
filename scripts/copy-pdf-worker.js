// Copies the pdf.js worker bundled with `react-pdf`'s pinned `pdfjs-dist`
// dependency into `public/`, so the PDF viewer can self-host it instead of
// pulling it from a CDN. Runs as `postinstall` so it can't drift out of sync
// with whatever pdfjs-dist version is actually installed, and so it survives
// a clean `npm ci` in CI/deploy.
const fs = require('fs');
const path = require('path');

// Resolved via react-pdf rather than a bare `require.resolve('pdfjs-dist/...')`:
// npm's `overrides` field (used to pin pdfjs-dist to a version compatible with
// this project's Next.js/webpack setup — see next.config.js) can leave the
// package nested under node_modules/react-pdf/node_modules/pdfjs-dist instead
// of hoisted to the top level, depending on the rest of the dependency tree.
// Resolving relative to react-pdf's own location finds it either way.
const pdfjsPackageJson = require.resolve('pdfjs-dist/package.json', {
  paths: [require.resolve('react-pdf')],
});
const pdfjsRoot = path.dirname(pdfjsPackageJson);
const workerSrc = path.join(pdfjsRoot, 'build', 'pdf.worker.min.mjs');
const workerDest = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs');

if (!fs.existsSync(workerSrc)) {
  console.error(`[copy-pdf-worker] Could not find worker at ${workerSrc}. Is pdfjs-dist installed?`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(workerDest), { recursive: true });
fs.copyFileSync(workerSrc, workerDest);
const { version } = require(pdfjsPackageJson);
console.log(`[copy-pdf-worker] Copied pdf.worker.min.mjs (pdfjs-dist@${version}) to public/`);
