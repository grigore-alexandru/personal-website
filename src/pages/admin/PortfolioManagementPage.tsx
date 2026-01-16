import { Construction } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';

export function PortfolioManagementPage() {
  return (
    <AdminLayout currentSection="Portfolio Management">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-neutral-100 mb-6">
            <Construction size={48} className="text-neutral-400" />
          </div>

          <h2 className="text-3xl font-bold text-black mb-3">Under Maintenance</h2>
          <p className="text-neutral-600 text-lg max-w-md">
            Portfolio management features are coming soon. You'll be able to manage your video projects here.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
