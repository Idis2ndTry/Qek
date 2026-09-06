import type { PlaceSuggestion } from './nominatim';

/**
 * Gezielte Campingplatz-Suche über die Overpass-API von OpenStreetMap.
 *
 * Nominatims Textsuche findet einen Platz nur, wenn man den Namen fast
 * exakt trifft. Overpass fragt stattdessen direkt die Karte ab: "gib mir
 * alles, was in diesem Umkreis als Campingplatz eingetragen ist". Damit
 * tauchen auch kleine, namenlose und abgelegene Plätze auf.
 *
 * Kostenlos und ohne Schlüssel, aber die Server sind Spenden-finanziert -
 * deshalb wird gedrosselt, ein Zeitlimit gesetzt und sparsam abgefragt.
 */

/** Mehrere Server, damit ein überlasteter Mirror die Suche nicht blockiert. */
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const MIN_REQUEST_GAP_MS = 1500;
const QUERY_TIMEOUT_S = 25;

let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

export type CampsiteSuggestion = PlaceSuggestion & {
  /** Luftlinie zum Suchmittelpunkt in Metern. */
  distanceMeters: number;
  /** Was OSM über den Platz weiß - für die Merkmale beim Anlegen. */
  features: {
    caravans: boolean | null;
    tents: boolean | null;
    power: boolean | null;
    shower: boolean | null;
    toilets: boolean | null;
    drinkingWater: boolean | null;
    dogs: boolean | null;
    openAllYear: boolean | null;
    website: string | null;
    phone: string | null;
  };
};

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Entfernung zweier Punkte in Metern (Haversine). */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** OSM-Tag zu ja/nein/unbekannt. */
function yesNo(value: string | undefined): boolean | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === 'yes' || v === 'designated' || v === 'only') return true;
  if (v === 'no') return false;
  return null;
}

function buildAddress(tags: Record<string, string>): string {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const city = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
  const parts = [street, city, tags['addr:country']].filter(Boolean);
  return parts.join(', ');
}

function toSuggestion(
  element: OverpassElement,
  originLat: number,
  originLon: number,
): CampsiteSuggestion | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;

  const tags = element.tags ?? {};
  const kind = tags.tourism ?? null;

  // Namenlose Plätze bekommen einen beschreibenden Ersatznamen statt
  // "unbenannt" - sonst kann man sie in der Liste nicht auseinanderhalten.
  const fallbackName =
    kind === 'caravan_site' ? 'Wohnmobilstellplatz' : 'Campingplatz';
  const place = tags['addr:city'] ?? tags['addr:suburb'] ?? '';
  const name = tags.name?.trim() || (place ? `${fallbackName} ${place}` : `${fallbackName} (ohne Namen)`);

  return {
    sourceId: `osm:${element.type}/${element.id}`,
    name,
    address: buildAddress(tags),
    lat,
    lon,
    country: tags['addr:country'] ?? null,
    kind,
    distanceMeters: distanceMeters(originLat, originLon, lat, lon),
    features: {
      caravans: yesNo(tags.caravans),
      tents: yesNo(tags.tents),
      power: yesNo(tags.power_supply) ?? yesNo(tags['power_supply:type']),
      shower: yesNo(tags.shower),
      toilets: yesNo(tags.toilets),
      drinkingWater: yesNo(tags.drinking_water),
      dogs: yesNo(tags.dog),
      openAllYear: tags.opening_hours === '24/7' || tags.seasonal === 'no' ? true : null,
      website: tags.website ?? tags['contact:website'] ?? null,
      phone: tags.phone ?? tags['contact:phone'] ?? null,
    },
  };
}

async function runQuery(query: string, signal?: AbortSignal): Promise<OverpassElement[]> {
  await throttle();
  let lastError: unknown = null;

  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      });
      if (!response.ok) {
        // 429/504 heisst überlastet - der nächste Mirror bekommt eine Chance.
        lastError = new Error(`Overpass ${response.status}`);
        continue;
      }
      const data = (await response.json()) as { elements?: OverpassElement[] };
      return data.elements ?? [];
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error('Overpass nicht erreichbar');
}

/**
 * Alle Campingplätze im Umkreis. Findet der erste Radius nichts, wird
 * einmal weiter aufgezogen - besser ein Treffer aus 40 km als gar keiner.
 */
export async function findCampsitesNear(
  lat: number,
  lon: number,
  options?: { radiusMeters?: number; signal?: AbortSignal; expandIfEmpty?: boolean },
): Promise<CampsiteSuggestion[]> {
  const radii = [options?.radiusMeters ?? 25_000];
  if (options?.expandIfEmpty !== false) radii.push(60_000);

  for (const radius of radii) {
    const query = `[out:json][timeout:${QUERY_TIMEOUT_S}];
nwr["tourism"~"^(camp_site|caravan_site)$"](around:${Math.round(radius)},${lat},${lon});
out center 80;`;

    const elements = await runQuery(query, options?.signal);
    const results = elements
      .map((element) => toSuggestion(element, lat, lon))
      .filter((s): s is CampsiteSuggestion => s !== null)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    if (results.length > 0) return results;
  }
  return [];
}

/**
 * Campingplätze nach Namen suchen - deutschlandweit und in den
 * Nachbarländern. Greift, wenn jemand nur den Platznamen kennt, aber
 * nicht den Ort dazu.
 */
export async function searchCampsitesByName(
  name: string,
  options?: { signal?: AbortSignal; bbox?: [number, number, number, number] },
): Promise<CampsiteSuggestion[]> {
  const term = name.trim();
  if (term.length < 3) return [];

  // Süd-West- bis Nord-Ost-Ecke: Deutschland samt Nachbarländern und
  // niederländischer Küste - der Bereich, in dem hier gecampt wird.
  const [south, west, north, east] = options?.bbox ?? [45.5, 3.0, 55.5, 17.5];

  // Sonderzeichen entschärfen, damit der Suchbegriff die Overpass-Regex
  // nicht sprengt.
  const safe = term.replace(/[\\^$.*+?()[\]{}|"]/g, ' ').trim();
  if (!safe) return [];

  const query = `[out:json][timeout:${QUERY_TIMEOUT_S}];
nwr["tourism"~"^(camp_site|caravan_site)$"]["name"~"${safe}",i](${south},${west},${north},${east});
out center 60;`;

  const elements = await runQuery(query, options?.signal);
  const centerLat = (south + north) / 2;
  const centerLon = (west + east) / 2;

  return elements
    .map((element) => toSuggestion(element, centerLat, centerLon))
    .filter((s): s is CampsiteSuggestion => s !== null);
}

/** "1,2 km" bzw. "800 m" für die Trefferliste. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
