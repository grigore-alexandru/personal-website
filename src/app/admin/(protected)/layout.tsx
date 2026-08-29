// Route segment config must live in the route file — cannot be re-exported
// from a component module. The shared rendering logic is in AdminSectionLayout.
export const dynamic = 'force-dynamic';

export { default } from '@/components/admin/AdminSectionLayout';