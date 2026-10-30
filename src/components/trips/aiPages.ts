// What each screen tells the AI (see ai.tsx). Plain text facts, the selection first.
import type { Day, Place, TripDoc } from '@/lib/trips/schema';
import { dayBudget, formatMoney, missingPriceLines, sumLines, tripBudget, CATEGORY_LABEL } from '@/lib/trips/money';
import { formatDateRo, formatDateShort } from '@/lib/trips/time';
import { itemMinutes, itemName, validateDay } from '@/lib/trips/validate';
import type { AiPage } from './ai';
import { AREA, PLACE_KIND } from './tripConfig';
import { kmText, nearest, type LatLng } from './geo';
import { minutesText, scheduledDates, ticketsToBuy } from './helpers';

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const oneLine = (s: string) => s.replace(/\s*\n+\s*/g, ' · ');

export function placeLine(p: Place, dates?: string[]): string {
  const where = p.meetingPoint ? `${p.location?.address ?? ''} (punct de plecare: ${p.meetingPoint.name})` : p.location?.address ?? 'fără adresă';
  const bits = [`${p.name} [${PLACE_KIND[p.kind]}, ${AREA[p.area]}] — ${where}`];
  if (p.hours) bits.push(`program: ${p.hours.text}`);
  if (dates?.length) bits.push(`programat: ${dates.map(formatDateShort).join(', ')}`);
  return bits.join('; ');
}

export function placeDetails(p: Place, doc: TripDoc): string[] {
  const dates = scheduledDates(doc).get(p.id) ?? [];
  const lines = [`Locul selectat: ${placeLine(p, dates)}`];
  if (p.duration) lines.push(`Durată: ${p.duration.text}`);
  if (p.transport) lines.push(`Transport: ${clip(oneLine(p.transport), 500)}`);
  if (p.booking) lines.push(`Bilet/rezervare: ${p.booking.status === 'booked' ? 'luat' : p.booking.status === 'todo' ? 'de luat' : 'nu e nevoie'}${p.booking.note ? ` — ${p.booking.note}` : ''}`);
  if (p.costTemplate.length) lines.push(`Cost: ${formatMoney(sumLines(p.costTemplate))}`);
  if (p.notes) lines.push(`Note: ${clip(oneLine(p.notes), 700)}`);
  return lines;
}

export function dayLines(day: Day, doc: TripDoc): string[] {
  const places = new Map(doc.places.map((p) => [p.id, p]));
  const lines = [
    `Ziua: ${formatDateRo(day.date)} — ${day.title} (${day.status === 'confirmed' ? 'confirmată' : 'propusă'}), cost ${formatMoney(dayBudget(day).total)}`,
  ];
  day.items.forEach((i, n) => {
    const p = i.placeId ? places.get(i.placeId) : undefined;
    const len = itemMinutes(i, places);
    lines.push(
      `${n + 1}. ${i.start ?? 'fără oră'} ${itemName(i, places)}${len ? ` (${minutesText(len)})` : ''}${p?.location?.address ? ` — ${p.location.address}` : ''}${i.done ? ' [făcut]' : ''}${i.kind === 'deadline' ? ' [limită fixă]' : i.fixed ? ' [oră fixă]' : ''}`,
    );
  });
  for (const w of validateDay(day, doc).filter((w) => w.severity !== 'info')) lines.push(`Atenție: ${w.message}`);
  if (day.notes) lines.push(`Note zi: ${oneLine(day.notes)}`);
  return lines;
}

export function aziPage(doc: TripDoc, today: string): AiPage {
  const day = doc.days.find((d) => d.date === today);
  if (!day) {
    return {
      title: 'Azi — înainte de plecare',
      lines: [`Prima zi: ${formatDateRo(doc.days[0].date)} — ${doc.days[0].title}`, ...ticketsToBuy(doc).map((t) => `Bilet de luat: ${t.place.name}`)],
      suggestions: ['Ce trebuie să mai pregătesc înainte de plecare?', 'Ce să fac în prima zi după aterizare la SFO?'],
    };
  }
  const tomorrow = doc.days[doc.days.indexOf(day) + 1];
  return {
    title: `Azi — ${formatDateRo(day.date)}`,
    lines: [...dayLines(day, doc), ...(tomorrow ? [`Mâine: ${tomorrow.title}`] : [])],
    suggestions: ['Ce fac acum, în ordinea cea mai bună?', 'Unde mănânc ceva sănătos aproape de mine?', 'Cum ajung la următorul loc?'],
  };
}

export function dayPage(day: Day, doc: TripDoc): AiPage {
  return {
    title: `Ziua ${formatDateRo(day.date)}`,
    lines: dayLines(day, doc),
    suggestions: ['E realist programul zilei? Ce ordine îmi recomanzi?', 'Unde pot mânca în ziua asta, pe traseu?', 'Cât mă costă transportul în ziua asta?'],
  };
}

export function zilePage(doc: TripDoc): AiPage {
  return {
    title: 'Zile — toată perioada',
    lines: doc.days.map((d) => `${formatDateShort(d.date)}: ${d.title} (${d.status === 'confirmed' ? 'confirmat' : 'propus'}, ${formatMoney(dayBudget(d).total, { compact: true })})`),
    suggestions: ['E echilibrat planul pe zile? Ce aș muta?', 'Care zi e cea mai încărcată?'],
  };
}

export function mapPage(doc: TripDoc, opts: { day: Day | null; selected: Place | null; me: LatLng | null; showFood: boolean }): AiPage {
  const { day, selected, me, showFood } = opts;
  const dates = scheduledDates(doc);
  const lines: string[] = [];
  if (selected) lines.push(...placeDetails(selected, doc));
  if (me) {
    lines.push('Cele mai apropiate locuri din plan, în linie dreaptă:');
    for (const n of nearest(me, doc.places.filter((p) => p.kind !== 'food'), 5)) lines.push(`  ${kmText(n.km)} — ${placeLine(n.place)}`);
    const food = nearest(me, doc.places.filter((p) => p.kind === 'food'), 4);
    if (food.length) {
      lines.push('Cele mai apropiate locuri de mâncare din lista mea:');
      for (const n of food) lines.push(`  ${kmText(n.km)} — ${placeLine(n.place)}${n.place.notes ? ` (${n.place.notes.split('\n')[0]})` : ''}`);
    }
  }
  if (day) lines.push(...dayLines(day, doc));
  else if (!me && !selected)
    lines.push(
      'Locurile din plan (nume — adresă — zile):',
      ...doc.places.filter((p) => p.location && p.kind !== 'food').map((p) => `  ${p.name} — ${p.location!.address ?? ''}${dates.get(p.id)?.length ? ` — ${dates.get(p.id)!.map(formatDateShort).join(', ')}` : ''}`),
    );
  if (showFood && !me)
    lines.push('Locuri de mâncare din lista mea:', ...doc.places.filter((p) => p.kind === 'food').map((p) => `  ${p.name} — ${p.location?.address ?? 'peste tot în oraș'}${p.notes ? ` (${p.notes.split('\n')[0]})` : ''}`));
  return {
    title: `Hartă — ${day ? formatDateRo(day.date) : 'toată călătoria'}${selected ? ` · ${selected.name}` : ''}`,
    lines,
    suggestions: [
      'Care e cel mai apropiat loc bun de mâncare de mine, deschis acum?',
      'Care e cel mai apropiat supermarket / magazin de mine?',
      selected ? `Cum ajung la ${selected.name} de unde sunt?` : 'Ce merită văzut aproape de mine?',
    ],
    location: me,
  };
}

export function placesPage(doc: TripDoc, shown: Place[]): AiPage {
  return {
    title: `Locuri (${shown.length})`,
    lines: shown.map((p) => placeLine(p, scheduledDates(doc).get(p.id))),
    suggestions: ['Ce locuri lipsesc din plan și merită adăugate?', 'Ce locuri se potrivesc în aceeași zi?'],
  };
}

export function placePage(p: Place, doc: TripDoc): AiPage {
  return {
    title: `Loc — ${p.name}`,
    lines: placeDetails(p, doc),
    suggestions: [`Ce merită să știu despre ${p.name}?`, `Cum ajung la ${p.name}?`, 'Unde mănânc ceva bun aproape?'],
  };
}

export function ticketsPage(doc: TripDoc): AiPage {
  return {
    title: 'Bilete',
    lines: [
      ...ticketsToBuy(doc).map((t) => `De luat: ${t.place.name} (${t.dates.map(formatDateShort).join(', ') || 'neprogramat'})${t.place.booking?.note ? ` — ${t.place.booking.note}` : ''}${t.place.booking?.url ? ` — ${t.place.booking.url}` : ''}`),
      ...doc.days.flatMap((d) => d.items.filter((i) => i.fixed || i.kind === 'deadline').map((i) => `Oră fixă ${formatDateShort(d.date)}: ${i.start ?? '—'} ${i.label ?? i.placeId}`)),
    ],
    suggestions: ['Mai sunt locuri disponibile pentru biletele astea la datele mele?', 'Ce bilete ar trebui să cumpăr mai întâi?'],
  };
}

export function budgetPage(doc: TripDoc): AiPage {
  const b = tripBudget(doc);
  const cats = Object.entries(b.byCategory).map(([c, m]) => `${CATEGORY_LABEL[c as keyof typeof CATEGORY_LABEL]}: ${formatMoney(m)}`);
  return {
    title: 'Buget',
    lines: [`Total: ${formatMoney(b.total)} (plătit $${(b.total.paidCents / 100).toFixed(2)})`, ...cats, `Prețuri lipsă: ${missingPriceLines(doc).map((r) => `${r.line.label}${r.date ? ` (${formatDateShort(r.date)})` : ''}`).join('; ')}`],
    suggestions: ['Cum pot reduce costurile?', 'Estimează prețurile care lipsesc, din surse oficiale.'],
  };
}
