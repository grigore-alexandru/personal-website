// src/lib/trips/sync.ts — load, poll and save with compare-and-swap (hash), replaying the mutation on conflict.
import { TripDoc } from "./schema";
import type { Mutation } from "./mutations";

export type Snapshot = { doc: TripDoc; hash: string; updatedAt: string };

export interface TripStore {
  load(tripId: string): Promise<Snapshot>;
  loadHash(tripId: string): Promise<string>;
  /** Throws ConflictError when the stored hash differs from expectedHash. */
  save(tripId: string, expectedHash: string, doc: TripDoc): Promise<{ hash: string; updatedAt: string }>;
}

export class ConflictError extends Error {}
export class InvalidDocError extends Error {}

/** Supabase adapter. `supabase` is the site's existing browser client (session = logged-in admin). */
export function supabaseStore(supabase: any): TripStore {
  return {
    async load(tripId) {
      const { data, error } = await supabase.from("trip_documents").select("doc, hash, updated_at").eq("id", tripId).single();
      if (error) throw error;
      return { doc: TripDoc.parse(data.doc), hash: data.hash, updatedAt: data.updated_at };
    },
    async loadHash(tripId) {
      const { data, error } = await supabase.from("trip_documents").select("hash").eq("id", tripId).single();
      if (error) throw error;
      return data.hash;
    },
    async save(tripId, expectedHash, doc) {
      const { data, error } = await supabase.rpc("trip_save", { p_trip: tripId, p_expected_hash: expectedHash, p_doc: doc });
      if (error) {
        if (String(error.message).includes("trip_conflict")) throw new ConflictError("trip_conflict");
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return { hash: row.new_hash, updatedAt: row.saved_at };
    },
  };
}

/**
 * Apply `mutation` to the latest snapshot and save it.
 * On conflict (someone else saved first: phone, laptop or Claude) reload and re-apply, up to maxAttempts.
 */
export async function commit(store: TripStore, tripId: string, current: Snapshot, mutation: Mutation, maxAttempts = 3): Promise<Snapshot> {
  let base = current;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const nextDoc = mutation(base.doc);
    const parsed = TripDoc.safeParse(nextDoc);
    if (!parsed.success) throw new InvalidDocError(parsed.error.issues.map((i) => i.message).join("; "));
    try {
      const saved = await store.save(tripId, base.hash, parsed.data);
      return { doc: parsed.data, hash: saved.hash, updatedAt: saved.updatedAt };
    } catch (e) {
      if (!(e instanceof ConflictError) || attempt === maxAttempts) throw e;
      base = await store.load(tripId);
    }
  }
  throw new ConflictError("unreachable");
}

/** Serialise commits so two quick taps on the phone never race each other. */
export function createCommitQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(job: () => Promise<T>): Promise<T> => {
    const run = tail.then(job, job);
    tail = run.catch(() => undefined);
    return run;
  };
}
