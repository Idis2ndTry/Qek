import type { PlaceSuggestion } from './nominatim';

/**
 * Campingplätze aus der OpenStreetMap-Karte holen - über die Overpass-API.
 *
 * Nominatims Textsuche findet einen Platz nur, wenn man den Namen trifft.
 * Overpass fragt stattdessen die Karte selbst ab: "gib mir alles, was in
 * diesem Umkreis als Campingplatz eingetragen ist". Damit tauchen auch
 * kleine, namenlose und abgelegene Plätze auf.
 *
 * Bewusst nur Umkreis-Abfragen (`around:`): die laufen über einen
 * räumlichen Index und antworten in ein bis zwei Sekunden. Eine
 * landesweite Namenssuche per Regex wäre um Größenordnungen teurer und
 * läuft auf den öffentlichen Servern regelmäßig in den Timeout.
 */

/** Mehrere Server, damit ein überlasteter Mirror die Suche nicht blockiert. */
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const MIN_REQUEST_GAP_MS = 1200;
/** Serverseitiges Zeitlimit der Abfrage. */
const QUERY_TIMEOUT_S = 20;
/** Abbruch auf unserer Seite, falls ein Mirror gar nicht antwortet. */
const CLIENT_TIMEOUT_MS = 12_000;

let lastRequestAt = 0;

/** Setzt die Drosselung zurück. Nur für Tests gedacht. */
export function resetRateLimit(): void {
  lastRequestAt = 0;
}

async function throttle(signal?: AbortSignal): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
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

export type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Entfernung zweier Punkte in Metern (Haversine). */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return [street, city].filter(Boolean).join(', ');
}

export function elementToCampsite(
  element: OverpassElement,
  originLat: number,
  originLon: number,
): CampsiteSuggestion | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;

  const tags = element.tags ?? {};
  const kind = tags.tourism ?? null;

  // Namenlose Plätze bekommen einen beschreibenden Ersatznamen samt Ort,
  // sonst kann man sie in der Liste nicht auseinanderhalten.
  const base = kind === 'caravan_site' ? 'Wohnmobilstellplatz' : 'Campingplatz';
  const where = tags['addr:city'] ?? tags['addr:suburb'] ?? tags['addr:village'] ?? '';
  const name = tags.name?.trim() || (where ? `${base} ${where}` : `${base} (ohne Namen)`);

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
      power: yesNo(tags.power_supply),
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

/**
 * Schickt die Abfrage an den ersten Server, der antwortet. Ein Mirror, der
 * überlastet ist (429/504) oder gar nicht reagiert, wird übersprungen.
 */
async function runQuery(query: string, signal?: AbortSignal): Promise<OverpassElement[]> {
  await throttle(signal);
  let lastError: unknown = null;

  for (const endpoint of ENDPOINTS) {
    // Eigenes Zeitlimit zusätzlich zum Abbruchsignal des Aufrufers.
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), CLIENT_TIMEOUT_MS);
    const onAbort = () => timeout.abort();
    signal?.addEventListener('abort', onAbort);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: timeout.signal,
      });
      if (!response.ok) {
        lastError = new Error(`Overpass ${response.status}`);
        continue;
      }
      const data = (await response.json()) as { elements?: OverpassElement[] };
      return Array.isArray(data.elements) ? data.elements : [];
    } catch (error) {
      // Ein Abbruch durch den Aufrufer beendet alles; ein eigenes Zeitlimit
      // gibt dem nächsten Mirror eine Chance.
      if (signal?.aborted) throw error;
      lastError = error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  throw lastError ?? new Error('Overpass nicht erreichbar');
}

/** Baut die Umkreis-Abfrage. Ausgelagert, damit sie testbar ist. */
export function buildAroundQuery(lat: number, lon: number, radiusMeters: number): string {
  return `[out:json][timeout:${QUERY_TIMEOUT_S}];
nwr["tourism"~"^(camp_site|caravan_site)$"](around:${Math.round(radiusMeters)},${lat.toFixed(6)},${lon.toFixed(6)});
out center 200;`;
}

/**
 * Alle Campingplätze im Umkreis, nach Entfernung sortiert.
 *
 * `radiiMeters` wird der Reihe nach durchprobiert, bis etwas gefunden wird -
 * besser ein Treffer aus 60 km als eine leere Liste.
 */
export async function findCampsitesNear(
  lat: number,
  lon: number,
  options?: { radiiMeters?: number[]; signal?: AbortSignal },
): Promise<CampsiteSuggestion[]> {
  const radii = options?.radiiMeters ?? [30_000, 75_000];

  for (const radius of radii) {
    const elements = await runQuery(buildAroundQuery(lat, lon, radius), options?.signal);
    const results = dedupeByLocation(
      elements
        .map((element) => elementToCampsite(element, lat, lon))
        .filter((s): s is CampsiteSuggestion => s !== null),
    ).sort((a, b) => a.distanceMeters - b.distanceMeters);

    if (results.length > 0) return results;
  }
  return [];
}

/**
 * Größere Plätze sind in OSM oft doppelt erfasst - als Fläche und als
 * Punkt darin. Beides untereinander in der Liste sieht aus wie ein Fehler.
 */
export function dedupeByLocation(items: CampsiteSuggestion[]): CampsiteSuggestion[] {
  const kept: CampsiteSuggestion[] = [];

  for (const item of items) {
    const duplicate = kept.find(
      (other) =>
        distanceMeters(item.lat, item.lon, other.lat, other.lon) < 120 &&
        (normalize(item.name) === normalize(other.name) ||
          !item.name.match(/\p{L}/u) ||
          isFallbackName(item.name) ||
          isFallbackName(other.name)),
    );
    if (!duplicate) {
      kept.push(item);
    } else if (isFallbackName(duplicate.name) && !isFallbackName(item.name)) {
      // Den Eintrag mit echtem Namen behalten.
      kept[kept.indexOf(duplicate)] = item;
    }
  }
  return kept;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
}

function isFallbackName(name: string): boolean {
  return /^(Campingplatz|Wohnmobilstellplatz)( .*)?$/.test(name) && !/[a-z]{3,}\s\w/.test(name);
}

/** "1,2 km" bzw. "800 m" für die Trefferliste. */
export function formatDistance(meters: number): string {
  if (meters < 950) return `${Math.max(50, Math.round(meters / 50) * 50)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
