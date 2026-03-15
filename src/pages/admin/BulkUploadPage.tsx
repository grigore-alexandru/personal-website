import { AdminLayout } from '../../components/admin/AdminLayout';
import { Layers } from 'lucide-react';

export function BulkUploadPage() {
  return (
    <AdminLayout currentSection="Bulk Upload">
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <Layers size={48} className="text-gray-300" />
        <h2 className="text-2xl font-bold text-black">Bulk Upload</h2>
        <p className="text-gray-500 max-w-md">
          The bulk upload workflow is being built. Check back soon.
        </p>
      </div>
    </AdminLayout>
  );
}
