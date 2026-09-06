import {
  isCampsiteKind,
  searchPlaces,
  type PlaceSuggestion,
} from './nominatim';
import { findCampsitesNear, type CampsiteSuggestion } from './overpass';

/**
 * Führt die beiden Suchquellen zusammen.
 *
 * Der entscheidende Punkt: Die Quellen laufen getrennt und melden sich
 * einzeln zurück. Nominatim antwortet in unter einer Sekunde und füllt die
 * Liste sofort; die Overpass-Umkreissuche braucht länger und ergänzt später.
 * Würden beide auf einmal abgewartet, sähe der Nutzer sekundenlang nichts -
 * und beim Weitertippen gar nichts mehr.
 */

export type SearchUpdate = {
  /** Namentliche Treffer, die als Campingplatz eingetragen sind. */
  campsites: CampsiteSuggestion[];
  /** Orte und Adressen - zum Antippen für die Umkreissuche. */
  places: PlaceSuggestion[];
  /** Umkreis-Treffer rund um den besten Ortstreffer. */
  nearby: CampsiteSuggestion[];
  /** Name des Ortes, um den herum gesucht wurde. */
  nearbyLabel: string | null;
  /** Läuft noch eine der beiden Quellen? */
  loading: boolean;
  /** Gesetzt, wenn eine Quelle ausgefallen ist - die andere zählt weiter. */
  placesFailed: boolean;
  nearbyFailed: boolean;
};

const EMPTY: SearchUpdate = {
  campsites: [],
  places: [],
  nearby: [],
  nearbyLabel: null,
  loading: false,
  placesFailed: false,
  nearbyFailed: false,
};

/** Kandidat für den Mittelpunkt der Umkreissuche. */
function pickAnchor(results: PlaceSuggestion[]): PlaceSuggestion | null {
  // Ein Ort ist der bessere Mittelpunkt als eine einzelne Adresse; gibt es
  // keinen, tut es der erste Treffer.
  const settlement = results.find((r) =>
    ['village', 'town', 'city', 'hamlet', 'municipality', 'suburb', 'administrative'].includes(
      r.kind ?? '',
    ),
  );
  return settlement ?? results[0] ?? null;
}

/**
 * Startet die Suche und ruft `onUpdate` mehrfach auf - einmal, sobald
 * Nominatim geantwortet hat, und noch einmal, wenn die Umkreissuche fertig
 * ist. Der Rückgabewert bricht beide Anfragen ab.
 */
export function runSearch(
  query: string,
  onUpdate: (update: SearchUpdate) => void,
): () => void {
  const controller = new AbortController();
  const state: SearchUpdate = { ...EMPTY, loading: true };

  let nominatimDone = false;
  let overpassDone = true; // wird auf false gesetzt, sobald sie startet

  const publish = () => {
    if (controller.signal.aborted) return;
    onUpdate({ ...state, loading: !nominatimDone || !overpassDone });
  };

  publish();

  searchPlaces(query, { signal: controller.signal })
    .then((results) => {
      if (controller.signal.aborted) return;

      state.campsites = results
        .filter((r) => isCampsiteKind(r.kind))
        .map(withoutDistance);
      state.places = results.filter((r) => !isCampsiteKind(r.kind));
      nominatimDone = true;
      publish();

      // Zweite Stufe: alles, was rund um den besten Treffer als
      // Campingplatz in der Karte steht. Das findet die kleinen Plätze,
      // deren Namen man nicht kennt.
      const anchor = pickAnchor(results);
      if (!anchor) return;

      overpassDone = false;
      state.nearbyLabel = anchor.name;
      publish();

      return findCampsitesNear(anchor.lat, anchor.lon, { signal: controller.signal })
        .then((nearby) => {
          if (controller.signal.aborted) return;
          const known = new Set(state.campsites.map((c) => c.sourceId));
          state.nearby = nearby.filter((c) => !known.has(c.sourceId));
        })
        .catch((error: unknown) => {
          if (isAbort(error)) return;
          state.nearbyFailed = true;
        })
        .finally(() => {
          overpassDone = true;
          publish();
        });
    })
    .catch((error: unknown) => {
      if (isAbort(error)) return;
      state.placesFailed = true;
      nominatimDone = true;
      publish();
    });

  return () => controller.abort();
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))
  );
}

/** Ein Nominatim-Treffer hat keine Entfernung - Platzhalterwerte ergänzen. */
function withoutDistance(place: PlaceSuggestion): CampsiteSuggestion {
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
