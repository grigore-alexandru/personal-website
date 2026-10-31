import { redirect } from 'next/navigation';
import { LOCURI_HREF } from '@/components/trips/tripConfig';

// Locuri now lives under the map (Hartă tab); old links and bookmarks land there.
export default function Page() {
  redirect(LOCURI_HREF);
}
