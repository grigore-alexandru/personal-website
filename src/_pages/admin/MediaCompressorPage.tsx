import { AdminLayout } from '../../components/admin/AdminLayout';
import { MediaCompressor } from '../../components/admin/MediaCompressor';

export default function MediaCompressorPage() {
  return (
    <AdminLayout currentSection="Media Compressor">
      <MediaCompressor />
    </AdminLayout>
  );
}
