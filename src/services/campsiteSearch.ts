import {
  campingVariants,
  isCampsiteKind,
  searchPlaces,
  type PlaceSuggestion,
} from './nominatim';
import { findCampsitesNear, type CampsiteSuggestion } from './overpass';

/**
 * Führt die Suchquellen zusammen und meldet Zwischenstände.
 *
 * Drei Wege laufen nebeneinander, weil keiner allein alle Plätze findet:
 *
 * 1. Namenssuche bei Nominatim - schnell, findet aber nur, was man fast
 *    genau tippt.
 * 2. Dieselbe Suche noch einmal mit "Campingplatz" davor. In der Karte
 *    heißen die Plätze meist so; wer nur "Timmeler Meer" eingibt, bekommt
 *    sonst den See statt des Platzes.
 * 3. Umkreissuche bei Overpass um den besten Treffer - liefert alles, was
 *    dort als Platz eingetragen ist, auch ohne Namen.
 *
 * Jede Stufe meldet sich einzeln über `onUpdate`. Würde man auf alle
 * warten, sähe der Nutzer sekundenlang nichts und beim Weitertippen würde
 * die Suche verworfen, bevor je ein Treffer ankommt.
 */

export type SearchUpdate = {
  /** Alle gefundenen Plätze, Namenstreffer zuerst. */
  campsites: CampsiteSuggestion[];
  /** Ort, um den herum gesucht wurde - nur als Hinweis für die Anzeige. */
  anchorLabel: string | null;
  /** Suchradius der Umkreissuche in Metern, null solange keine lief. */
  anchorRadius: number | null;
  loading: boolean;
  /** Die Namenssuche ist ausgefallen. */
  nameFailed: boolean;
  /** Die Umkreissuche ist ausgefallen. */
  nearbyFailed: boolean;
};

export const EMPTY_SEARCH: SearchUpdate = {
  campsites: [],
  anchorLabel: null,
  anchorRadius: null,
  loading: false,
  nameFailed: false,
  nearbyFailed: false,
};

/** Orte, die sich als Mittelpunkt für die Umkreissuche eignen. */
const SETTLEMENT_KINDS = new Set([
  'village',
  'town',
  'city',
  'hamlet',
  'municipality',
  'suburb',
  'administrative',
  'locality',
  'water',
  'lake',
  'island',
]);

/**
 * Mittelpunkt der Umkreissuche. Ein Ort oder ein See ist besser geeignet
 * als eine einzelne Hausnummer; notfalls tut es der erste Treffer.
 */
export function pickAnchor(results: PlaceSuggestion[]): PlaceSuggestion | null {
  const settlement = results.find((r) => SETTLEMENT_KINDS.has(r.kind ?? ''));
  return settlement ?? results[0] ?? null;
}

/** Ein Nominatim-Treffer hat keine Entfernung und keine Ausstattungsdaten. */
export function asCampsite(place: PlaceSuggestion): CampsiteSuggestion {
  return {
    ...place,
    distanceMeters: Number.NaN,
    features: {
      caravans: null,
      tents: null,
      power: null,
      shower: null,
      toilets: null,
      drinkingWater: null,
      dogs: null,
      openAllYear: null,
      website: null,
      phone: null,
    },
  };
}

/**
 * Führt Treffer aus mehreren Quellen zusammen: gleiche OSM-Kennung oder
 * praktisch gleiche Koordinaten zählen als ein Platz. Namenstreffer stehen
 * vorn, danach wird nach Entfernung sortiert.
 */
export function mergeCampsites(
  named: CampsiteSuggestion[],
  nearby: CampsiteSuggestion[],
): CampsiteSuggestion[] {
  const result: CampsiteSuggestion[] = [];
  const byId = new Map<string, CampsiteSuggestion>();

  const add = (item: CampsiteSuggestion) => {
    if (item.sourceId && byId.has(item.sourceId)) {
      // Der Umkreis-Treffer kennt Entfernung und Ausstattung - die
      // Angaben in den vorhandenen Eintrag übernehmen.
      const existing = byId.get(item.sourceId) as CampsiteSuggestion;
      if (!Number.isFinite(existing.distanceMeters) && Number.isFinite(item.distanceMeters)) {
        existing.distanceMeters = item.distanceMeters;
        existing.features = item.features;
        if (!existing.address) existing.address = item.address;
      }
      return;
    }
    const nearDuplicate = result.find(
      (other) => Math.abs(other.lat - item.lat) < 0.0015 && Math.abs(other.lon - item.lon) < 0.0025,
    );
    if (nearDuplicate) return;

    result.push(item);
    if (item.sourceId) byId.set(item.sourceId, item);
  };

  named.forEach(add);
  [...nearby].sort((a, b) => a.distanceMeters - b.distanceMeters).forEach(add);
  return result;
}

/**
 * Startet die Suche. Der Rückgabewert bricht alle laufenden Anfragen ab.
 */
export function runSearch(query: string, onUpdate: (update: SearchUpdate) => void): () => void {
  const controller = new AbortController();

  let named: CampsiteSuggestion[] = [];
  let nearby: CampsiteSuggestion[] = [];
  let anchorLabel: string | null = null;
  let anchorRadius: number | null = null;
  let nameFailed = false;
  let nearbyFailed = false;
  let pending = 0;

  const publish = () => {
    if (controller.signal.aborted) return;
    onUpdate({
      campsites: mergeCampsites(named, nearby),
      anchorLabel,
      anchorRadius,
      loading: pending > 0,
      nameFailed,
      nearbyFailed,
    });
  };

  const track = <T>(promise: Promise<T>): Promise<T> => {
    pending += 1;
    return promise.finally(() => {
      pending -= 1;
      publish();
    });
  };

  publish();

  // Stufe 1: Namenssuche. Liefert Campingplätze und den Ortsanker.
  track(
    searchPlaces(query, { signal: controller.signal })
      .then((results) => {
        if (controller.signal.aborted) return;

        named = mergeCampsites(
          named,
          results.filter((r) => isCampsiteKind(r.kind)).map(asCampsite),
        );
        publish();

        // Stufe 3: alles rund um den besten Treffer.
        const anchor = pickAnchor(results);
        if (!anchor) return;
        anchorLabel = anchor.name;

        track(
          findCampsitesNear(anchor.lat, anchor.lon, { signal: controller.signal })
            .then((found) => {
              if (controller.signal.aborted) return;
              nearby = found;
              anchorRadius = found.length > 0 ? Math.round(maxDistance(found)) : null;
            })
            .catch((error: unknown) => {
              if (isAbort(error)) return;
              nearbyFailed = true;
            }),
        );
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        nameFailed = true;
      }),
  );

  // Stufe 2: dieselbe Suche mit "Campingplatz" davor. Läuft unabhängig,
  // damit sie auch dann greift, wenn Stufe 1 nichts Passendes fand.
  for (const variant of campingVariants(query)) {
    track(
      searchPlaces(variant, { signal: controller.signal, limit: 15 })
        .then((results) => {
          if (controller.signal.aborted) return;
          named = mergeCampsites(
            named,
            results.filter((r) => isCampsiteKind(r.kind)).map(asCampsite),
          );
        })
        .catch(() => {
          // Die Zusatzschreibweise ist Kür - ein Fehler bleibt still.
        }),
    );
  }

  return () => controller.abort();
}

function maxDistance(items: CampsiteSuggestion[]): number {
  return items.reduce((max, item) => Math.max(max, item.distanceMeters || 0), 0);
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))
  );
}

/** Sucht ausschließlich im Umkreis - für "Plätze in meiner Nähe". */
export async function searchAround(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal; radiiMeters?: number[] },
): Promise<CampsiteSuggestion[]> {
  return findCampsitesNear(lat, lon, options);
}
