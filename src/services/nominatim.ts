/**
 * Orts- und Adresssuche über Nominatim (OpenStreetMap).
 *
 * Kostenlos und ohne API-Schlüssel. Die Nutzungsbedingungen verlangen einen
 * aussagekräftigen User-Agent und höchstens eine Anfrage pro Sekunde -
 * beides erledigt dieses Modul.
 *
 * Nominatim ist eine Textsuche: Es findet einen Campingplatz nur, wenn der
 * Suchbegriff im eingetragenen Namen vorkommt. Für die Plätze in der
 * Umgebung eines Ortes ist `overpass.ts` zuständig.
 */

const BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'QekToTheFuture-Reisetagebuch/1.0 (Camping-Tagebuch, Hobbyprojekt)';
const MIN_REQUEST_GAP_MS = 1100;

let lastRequestAt = 0;

/** Setzt die Drosselung zurück. Nur für Tests gedacht. */
export function resetRateLimit(): void {
  lastRequestAt = 0;
}

/**
 * Hält den Mindestabstand zwischen zwei Anfragen ein. Bricht sofort ab,
 * wenn die Suche in der Wartezeit verworfen wurde - sonst blockiert eine
 * längst veraltete Anfrage die nächste.
 */
async function throttle(signal?: AbortSignal): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  lastRequestAt = Date.now();
}

export type PlaceSuggestion = {
  /** z. B. "osm:node/240109189" - stabil über Nominatim-Anfragen hinweg. */
  sourceId: string;
  /** Kurzer Anzeigename, meist der Name des Platzes. */
  name: string;
  /** Vollständige Adresse. */
  address: string;
  lat: number;
  lon: number;
  country: string | null;
  /** Kategorie laut OSM, z. B. "caravan_site". */
  kind: string | null;
};

type NominatimResult = {
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  class?: string;
  address?: Record<string, string>;
};

/** OSM-Werte, die einen Campingplatz oder Stellplatz bezeichnen. */
const CAMPSITE_TYPES = new Set(['camp_site', 'caravan_site', 'camp_pitch', 'camping']);

export function isCampsiteKind(kind: string | null | undefined): boolean {
  return Boolean(kind && CAMPSITE_TYPES.has(kind));
}

export function toSuggestion(result: NominatimResult): PlaceSuggestion | null {
  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const display = result.display_name ?? '';
  const name = result.name?.trim() || display.split(',')[0]?.trim() || 'Unbenannter Ort';

  return {
    sourceId: result.osm_type && result.osm_id ? `osm:${result.osm_type}/${result.osm_id}` : '',
    name,
    address: display,
    lat,
    lon,
    country: result.address?.country ?? null,
    kind: result.type ?? result.class ?? null,
  };
}

/**
 * Sucht Orte, Adressen und namentlich passende Campingplätze.
 * `signal` bricht die Anfrage ab, wenn weitergetippt wird.
 */
export async function searchPlaces(
  query: string,
  options?: { signal?: AbortSignal; limit?: number },
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  await throttle(options?.signal);

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(options?.limit ?? 25),
    'accept-language': 'de',
  });

  const response = await fetch(`${BASE_URL}/search?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Ortssuche fehlgeschlagen (${response.status})`);
  }

  const data = (await response.json()) as NominatimResult[];
  if (!Array.isArray(data)) return [];

  return data
    .map(toSuggestion)
    .filter((s): s is PlaceSuggestion => s !== null)
    // Campingplätze nach oben, sonst die Reihenfolge von Nominatim behalten -
    // die ist nach Relevanz sortiert.
    .sort((a, b) => Number(isCampsiteKind(b.kind)) - Number(isCampsiteKind(a.kind)));
}

/** Adresse zu Koordinaten - für "Platz in meiner Nähe" und die Kartenauswahl. */
export async function reverseGeocode(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal },
): Promise<PlaceSuggestion | null> {
  await throttle(options?.signal);

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '16',
    'accept-language': 'de',
  });

  const response = await fetch(`${BASE_URL}/reverse?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: options?.signal,
  });

  if (!response.ok) return null;
  return toSuggestion((await response.json()) as NominatimResult);
}
