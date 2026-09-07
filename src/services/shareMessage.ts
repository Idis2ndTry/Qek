import { CATEGORIES } from '@/constants/categories';
import type { PlaceWithDetails } from '@/db/types';
import { formatDateRange, formatEuro, formatScore } from '@/utils/format';

/**
 * Baut die Texte für die Teilen-Funktion.
 *
 * Bewusst ohne jeden Bezug zu React Native: So lässt sich der Wortlaut
 * ohne laufende App prüfen - und der Teilen-Dialog selbst bleibt eine
 * dünne Hülle darüber (`share.ts`).
 *
 * Reiner Text ohne Formatierung, damit die Nachricht in WhatsApp, Mail
 * und überall sonst gleich ankommt.
 */

export const APP_NAME = 'Reise-Tagebuch';
export const AUTHOR = '@Qek_to_the_Future';

/** Bewertung als Sternreihe, z. B. "★★★★☆". */
export function starLine(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

/** Link auf den Google-Maps-Eintrag des Platzes. */
export function buildMapsUrl(place: {
  name: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
}): string | null {
  if (typeof place.lat === 'number' && typeof place.lon === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`;
  }
  const term = [place.name, place.address].filter(Boolean).join(' ').trim();
  if (!term) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(term)}`;
}

/** Die Nachricht zu einem einzelnen Platz. */
export function buildShareMessage(place: PlaceWithDetails): string {
  const lines: string[] = [];

  lines.push(`🏕️  ${place.name}`);

  if (place.overall !== null) {
    lines.push('');
    lines.push(`Meine Bewertung: ${formatScore(place.overall)} von 5 Sternen`);
    lines.push(starLine(Math.round(place.overall)));
  }

  const rated = CATEGORIES.filter((c) => place.ratings[c.key]);
  if (rated.length > 0) {
    lines.push('');
    // Namen auf gleiche Breite bringen, damit die Sterne möglichst
    // untereinander stehen.
    const width = Math.max(...rated.map((c) => c.label.length));
    for (const category of rated) {
      lines.push(`${category.label.padEnd(width, ' ')}  ${starLine(place.ratings[category.key])}`);
    }
  }

  const facts: string[] = [];
  const dates = formatDateRange(place.visitedFrom, place.visitedTo);
  if (dates) facts.push(`📅  ${dates}`);
  if (place.nights) facts.push(`🌙  ${place.nights} ${place.nights === 1 ? 'Nacht' : 'Nächte'}`);
  if (place.pricePerNight) facts.push(`💶  ${formatEuro(place.pricePerNight)} pro Nacht`);
  if (place.address) facts.push(`📍  ${place.address}`);
  if (facts.length > 0) {
    lines.push('');
    lines.push(...facts);
  }

  if (place.notes?.trim()) {
    lines.push('');
    lines.push(`„${place.notes.trim()}"`);
  }

  const mapsUrl = buildMapsUrl(place);
  if (mapsUrl) {
    lines.push('');
    lines.push('Auf der Karte ansehen:');
    lines.push(mapsUrl);
  }

  lines.push('');
  lines.push('––––––––––––––––––––');
  lines.push(`Aufgezeichnet mit ${APP_NAME}`);
  lines.push(`Camping-Reisetagebuch by ${AUTHOR}`);

  return lines.join('\n');
}

export type SummaryInput = {
  placeCount: number;
  totalNights: number;
  averageOverall: number | null;
  bestPlaceName: string | null;
};

/** Kurzfassung der gesamten Sammlung. */
export function buildSummaryMessage(stats: SummaryInput): string {
  const lines = [
    '🏕️  Mein Camping-Reisetagebuch',
    '',
    `${stats.placeCount} ${stats.placeCount === 1 ? 'Platz' : 'Plätze'} besucht`,
    `${stats.totalNights} ${stats.totalNights === 1 ? 'Nacht' : 'Nächte'} unterwegs`,
  ];
  if (stats.averageOverall !== null) {
    lines.push(`Schnitt: ${formatScore(stats.averageOverall)} von 5 Sternen`);
  }
  if (stats.bestPlaceName) {
    lines.push('');
    lines.push(`Lieblingsplatz: ${stats.bestPlaceName}`);
  }
  lines.push('');
  lines.push('––––––––––––––––––––');
  lines.push(`Aufgezeichnet mit ${APP_NAME}`);
  lines.push(`Camping-Reisetagebuch by ${AUTHOR}`);

  return lines.join('\n');
}
