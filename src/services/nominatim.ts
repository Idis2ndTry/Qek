/**
 * Ortssuche über Nominatim (OpenStreetMap).
 *
 * Kostenlos und ohne API-Key. Die Nutzungsbedingungen verlangen einen
 * aussagekräftigen User-Agent und höchstens eine Anfrage pro Sekunde -
 * beides erledigt dieses Modul.
 */

const BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'QekToTheFuture-Reisetagebuch/1.0 (Camping-Tagebuch, Hobbyprojekt)';
const MIN_REQUEST_GAP_MS = 1100;

let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
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

function toSuggestion(result: NominatimResult): PlaceSuggestion | null {
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
 * Sucht Campingplätze und andere Orte zum Suchbegriff.
 * `signal` erlaubt es, eine Anfrage abzubrechen, wenn weitergetippt wird.
 */
export async function searchPlaces(
  query: string,
  options?: { signal?: AbortSignal; limit?: number },
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  await throttle();

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(options?.limit ?? 12),
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
  return data
    .map(toSuggestion)
    .filter((s): s is PlaceSuggestion => s !== null)
    .sort((a, b) => rankKind(b.kind) - rankKind(a.kind));
}

/** Campingplätze sollen in der Trefferliste oben stehen. */
function rankKind(kind: string | null): number {
  if (!kind) return 0;
  if (kind === 'camp_site' || kind === 'caravan_site' || kind === 'camp_pitch') return 2;
  if (kind === 'camping' || kind === 'tourism') return 1;
  return 0;
}

/** Adresse zu Koordinaten - für "Platz in meiner Nähe". */
export async function reverseGeocode(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal },
): Promise<PlaceSuggestion | null> {
  await throttle();

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
