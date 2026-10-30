import { DayScreen } from '@/components/trips/screens/DayScreen';

export const metadata = { title: { absolute: 'Ziua · San Francisco' } };

export default function Page({ params }: { params: { date: string } }) {
  return <DayScreen date={params.date} />;
}
