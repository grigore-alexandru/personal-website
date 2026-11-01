'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { routeOf } from './tripConfig';
import { AziScreen } from './screens/AziScreen';
import { BileteScreen } from './screens/BileteScreen';
import { BugetScreen } from './screens/BugetScreen';
import { DayScreen } from './screens/DayScreen';
import { HartaScreen } from './screens/HartaScreen';
import { PlaceScreen } from './screens/PlaceScreen';
import { ProgramScreen } from './screens/ProgramScreen';
import { ZileScreen } from './screens/ZileScreen';

/** Picks the screen from the URL in the browser; the route files under app/ only exist for direct opens and page titles. */
export function TripRouter() {
  const pathname = usePathname() ?? '';
  const route = routeOf(pathname);
  useEffect(() => {
    if (route) document.title = `${route.title} · San Francisco`;
  }, [route?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  switch (route?.screen) {
    case 'azi':
      return <AziScreen />;
    case 'zile':
      return <ZileScreen />;
    case 'day':
      return <DayScreen key={route.param} date={route.param} />;
    case 'program':
      return <ProgramScreen />;
    case 'harta':
      return <HartaScreen />;
    case 'place':
      return <PlaceScreen key={route.param} placeId={route.param} />;
    case 'bilete':
      return <BileteScreen />;
    case 'buget':
      return <BugetScreen />;
    default:
      return null;
  }
}
