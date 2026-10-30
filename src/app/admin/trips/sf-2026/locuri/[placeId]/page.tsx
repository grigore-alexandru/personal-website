import { PlaceScreen } from '@/components/trips/screens/PlaceScreen';

export const metadata = { title: { absolute: 'Loc · San Francisco' } };

export default function Page({ params }: { params: { placeId: string } }) {
  return <PlaceScreen placeId={params.placeId} />;
}
