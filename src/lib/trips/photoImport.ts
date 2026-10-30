// src/lib/trips/photoImport.ts — server/Node only (sharp + fs). Converts the Obsidian PNGs of each place to
// WebP (1600 px, q78) + thumbnail (600 px, q72), uploads them to trip-media/<trip>/<place>/<n>.webp and writes
// the paths into the document through commit() (so it never overwrites edits made meanwhile).
// Used by scripts/trips/upload-photos.ts (service role) and the local-only route /api/admin/trips/photos
// (the signed-in admin's session; storage policies allow admins to write trip-media).
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";
import type { TripDoc } from "./schema";
import { commit, supabaseStore } from "./sync";

export const PHOTO_BUCKET = "trip-media";

export async function encode(file: string) {
  const full = await sharp(file).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  const thumb = await sharp(file).rotate().resize({ width: 600, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  return { full, thumb };
}

export type ImportResult = { uploaded: string[]; missing: string[]; skipped: number };

export async function importPhotos(opts: {
  supabase: any; // supabase-js client (service role or admin session)
  tripId: string;
  mediaDir: string;
  /** When set, writes the WebP files here instead of uploading and saves nothing. */
  dryRunDir?: string;
  write?: (path: string, body: Buffer) => void;
  log?: (line: string) => void;
}): Promise<ImportResult> {
  const { supabase, tripId, mediaDir, dryRunDir, write, log = () => undefined } = opts;
  if (!existsSync(mediaDir)) throw new Error(`media folder not found: ${mediaDir}`);
  const store = supabaseStore(supabase);
  const snap = await store.load(tripId);
  log(`loaded ${tripId} (${snap.doc.places.length} places)`);
  const uploaded = new Map<string, string>(); // `${placeId}#${index}` -> storage path
  const missing: string[] = [];
  let skipped = 0;
  for (const place of snap.doc.places) {
    for (const [index, photo] of place.photos.entries()) {
      if (photo.path) {
        skipped++;
        continue;
      }
      // Only plain file names from the note; never a path that could leave the media folder.
      if (basename(photo.source) !== photo.source) {
        missing.push(`${place.id}: ${photo.source}`);
        continue;
      }
      const file = join(mediaDir, photo.source);
      if (!existsSync(file)) {
        missing.push(`${place.id}: ${photo.source}`);
        continue;
      }
      log(`encoding ${photo.source}`);
      const { full, thumb } = await encode(file);
      const path = `${tripId}/${place.id}/${index}.webp`;
      const thumbPath = path.replace(/\.webp$/, ".thumb.webp");
      if (dryRunDir && write) {
        write(join(dryRunDir, path), full);
        write(join(dryRunDir, thumbPath), thumb);
      } else {
        for (const [p, body] of [[path, full], [thumbPath, thumb]] as const) {
          const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(p, body, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
          if (error) throw new Error(`${p}: ${error.message}`);
        }
      }
      uploaded.set(`${place.id}#${index}`, path);
      log(`${dryRunDir ? "[dry] " : ""}${place.id}[${index}] ${photo.source} → ${path} (${Math.round(full.length / 1024)} KB, thumb ${Math.round(thumb.length / 1024)} KB)`);
    }
  }
  if (!dryRunDir && uploaded.size > 0) {
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
  }
  return { uploaded: [...uploaded.values()], missing, skipped };
}
