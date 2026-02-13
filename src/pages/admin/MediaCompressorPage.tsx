import { AdminLayout } from '../../components/admin/AdminLayout';
import { MediaCompressor } from '../../components/admin/MediaCompressor';

export function MediaCompressorPage() {
  return (
    <AdminLayout currentSection="Media Compressor">
      <MediaCompressor />
    </AdminLayout>
  );
}
