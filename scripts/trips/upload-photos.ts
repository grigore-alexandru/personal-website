// scripts/trips/upload-photos.ts — run locally on the Mac, never deployed.
//   npm run trips:photos -- --media "<Obsidian>/Writing/Media" --trip sf-2026 [--dry-run]
// Needs SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in the shell env (not in the repo).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { commit, supabaseStore } from "../../src/lib/trips/sync";
import type { TripDoc } from "../../src/lib/trips/schema";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const media = arg("media");
const tripId = arg("trip") ?? "sf-2026";
const dryRun = process.argv.includes("--dry-run");
if (!media || !existsSync(media)) throw new Error(`--media folder not found: ${media}`);

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell (never commit them).");
const supabase = createClient(url, key, { auth: { persistSession: false } });
const store = supabaseStore(supabase);

export async function encode(file: string) {
  const full = await sharp(file).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  const thumb = await sharp(file).rotate().resize({ width: 600, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  return { full, thumb };
}

async function main() {
  const snap = await store.load(tripId);
  const uploaded = new Map<string, string>(); // `${placeId}#${index}` -> storage path
  const missing: string[] = [];
  for (const place of snap.doc.places) {
    for (const [index, photo] of place.photos.entries()) {
      if (photo.path) continue;
      const file = join(media!, photo.source);
      if (!existsSync(file)) { missing.push(`${place.id}: ${photo.source}`); continue; }
      const { full, thumb } = await encode(file);
      const path = `${tripId}/${place.id}/${index}.webp`;
      const thumbPath = path.replace(/\.webp$/, ".thumb.webp");
      if (dryRun) {
        mkdirSync(join("tmp-photos", tripId, place.id), { recursive: true });
        writeFileSync(join("tmp-photos", path), full);
        writeFileSync(join("tmp-photos", thumbPath), thumb);
      } else {
        for (const [p, body] of [[path, full], [thumbPath, thumb]] as const) {
          const { error } = await supabase.storage.from("trip-media").upload(p, body, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
          if (error) throw new Error(`${p}: ${error.message}`);
        }
      }
      uploaded.set(`${place.id}#${index}`, path);
      console.log(`${dryRun ? "[dry] " : ""}${place.id}[${index}] ${photo.source} → ${path} (${Math.round(full.length / 1024)} KB, thumb ${Math.round(thumb.length / 1024)} KB)`);
    }
  }
  if (missing.length) console.warn(`Missing files (skipped):\n  ${missing.join("\n  ")}`);
  if (dryRun || uploaded.size === 0) return;
  await commit(store, tripId, snap, (doc: TripDoc) => {
    const next = structuredClone(doc);
    for (const place of next.places) {
      place.photos.forEach((ph, i) => {
        const path = uploaded.get(`${place.id}#${i}`);
        if (path && !ph.path) ph.path = path;
      });
    }
    return next;
  });
  console.log(`Saved ${uploaded.size} photo paths into ${tripId}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
