// scripts/trips/upload-photos.ts — run locally on the Mac, never deployed.
//   npm run trips:photos -- --media "<Obsidian>/Writing/Media" --trip sf-2026 [--dry-run]
// Needs SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in the shell env (not in the repo).
// Without the key: run `next dev`, open /admin/trips/sf-2026/locuri signed in, and use "Importă pozele" (same code).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { importPhotos } from "../../src/lib/trips/photoImport";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const media = arg("media");
const tripId = arg("trip") ?? "sf-2026";
const dryRun = process.argv.includes("--dry-run");
if (!media) throw new Error("--media <folder> is required");

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell (never commit them).");
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const result = await importPhotos({
    supabase,
    tripId,
    mediaDir: media!,
    dryRunDir: dryRun ? "tmp-photos" : undefined,
    write: (path, body) => {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, body);
    },
    log: console.log,
  });
  if (result.missing.length) console.warn(`Missing files (skipped):\n  ${result.missing.join("\n  ")}`);
  console.log(dryRun ? `Dry run: ${result.uploaded.length} photos written to tmp-photos/.` : `Saved ${result.uploaded.length} photo paths into ${tripId}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
