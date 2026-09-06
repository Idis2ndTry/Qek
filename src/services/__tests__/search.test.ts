import { strict as assert } from 'node:assert';
import { test, mock, afterEach, beforeEach } from 'node:test';

import { toSuggestion, isCampsiteKind, searchPlaces, resetRateLimit as resetNominatim } from '../nominatim';
import {
  buildAroundQuery,
  dedupeByLocation,
  distanceMeters,
  elementToCampsite,
  findCampsitesNear,
  formatDistance,
  resetRateLimit as resetOverpass,
  type CampsiteSuggestion,
} from '../overpass';
import { runSearch } from '../campsiteSearch';

/** Antwort-Attrappe für fetch, damit die Tests ohne Netz laufen. */
type Route = { match: (url: string, init?: RequestInit) => boolean; body: unknown; status?: number; delayMs?: number };

function mockFetch(routes: Route[]) {
  const calls: { url: string; body?: string }[] = [];
  const fake = async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body as string | undefined });
    const route = routes.find((r) => r.match(url, init));
    if (!route) throw new Error(`Keine Route für ${url}`);
    if (route.delayMs) await new Promise((r) => setTimeout(r, route.delayMs));
    return {
      ok: route.status === undefined || route.status < 400,
      status: route.status ?? 200,
      json: async () => route.body,
    } as Response;
  };
  (globalThis as { fetch: unknown }).fetch = fake;
  return calls;
}

// Beide Dienste drosseln sich global. Ohne Rücksetzen würde jeder Test
// auf die Wartezeit des vorherigen warten.
beforeEach(() => {
  resetNominatim();
  resetOverpass();
});

afterEach(() => {
  mock.restoreAll();
});

// ---------------------------------------------------------------- Nominatim

test('toSuggestion liest einen Campingplatz korrekt aus', () => {
  const result = toSuggestion({
    osm_type: 'way',
    osm_id: 123,
    name: 'Campingplatz de Bantus',
    display_name: 'Campingplatz de Bantus, Surwold, Emsland, Niedersachsen, Deutschland',
    lat: '52.9876',
    lon: '7.5432',
    type: 'camp_site',
    class: 'tourism',
    address: { country: 'Deutschland' },
  });

  assert.ok(result);
  assert.equal(result.sourceId, 'osm:way/123');
  assert.equal(result.name, 'Campingplatz de Bantus');
  assert.equal(result.kind, 'camp_site');
  assert.equal(result.country, 'Deutschland');
  assert.ok(Math.abs(result.lat - 52.9876) < 1e-6);
});

test('toSuggestion verwirft Treffer ohne brauchbare Koordinaten', () => {
  assert.equal(toSuggestion({ name: 'Kaputt', lat: 'abc', lon: '7.5' }), null);
});

test('isCampsiteKind erkennt die Campingplatz-Typen', () => {
  assert.equal(isCampsiteKind('camp_site'), true);
  assert.equal(isCampsiteKind('caravan_site'), true);
  assert.equal(isCampsiteKind('village'), false);
  assert.equal(isCampsiteKind(null), false);
});

test('searchPlaces sortiert Campingplätze vor Orte', async () => {
  mockFetch([
    {
      match: (url) => url.includes('nominatim'),
      body: [
        { osm_type: 'node', osm_id: 1, name: 'Surwold', display_name: 'Surwold', lat: '52.98', lon: '7.55', type: 'village' },
        { osm_type: 'way', osm_id: 2, name: 'Camping de Bantus', display_name: 'Camping de Bantus, Surwold', lat: '52.99', lon: '7.56', type: 'camp_site' },
      ],
    },
  ]);

  const results = await searchPlaces('Surwold');
  assert.equal(results.length, 2);
  assert.equal(results[0].name, 'Camping de Bantus', 'Campingplatz muss oben stehen');
});

test('searchPlaces übersteht eine kaputte Antwort ohne Absturz', async () => {
  mockFetch([{ match: (url) => url.includes('nominatim'), body: { unerwartet: true } }]);
  assert.deepEqual(await searchPlaces('Surwold'), []);
});

// ----------------------------------------------------------------- Overpass

test('buildAroundQuery fragt beide Platzarten im Umkreis ab', () => {
  const query = buildAroundQuery(52.98, 7.55, 30000);
  assert.match(query, /camp_site/);
  assert.match(query, /caravan_site/);
  assert.match(query, /around:30000,52\.980000,7\.550000/);
  assert.match(query, /out center/);
  // Eine Namens-Regex wäre die teure Variante, die in den Timeout läuft.
  assert.doesNotMatch(query, /"name"~/);
});

test('elementToCampsite verarbeitet Flächen mit Mittelpunkt', () => {
  const result = elementToCampsite(
    {
      type: 'way',
      id: 42,
      center: { lat: 52.99, lon: 7.56 },
      tags: {
        tourism: 'camp_site',
        name: 'Campingplatz de Bantus',
        'addr:street': 'Zum Bantus',
        'addr:housenumber': '1',
        'addr:postcode': '26903',
        'addr:city': 'Surwold',
        caravans: 'yes',
        dog: 'yes',
        power_supply: 'yes',
      },
    },
    52.98,
    7.55,
  );

  assert.ok(result);
  assert.equal(result.name, 'Campingplatz de Bantus');
  assert.equal(result.address, 'Zum Bantus 1, 26903 Surwold');
  assert.equal(result.features.caravans, true);
  assert.equal(result.features.dogs, true);
  assert.equal(result.features.power, true);
  assert.ok(result.distanceMeters > 0 && result.distanceMeters < 3000);
});

test('elementToCampsite gibt namenlosen Plätzen einen erkennbaren Namen', () => {
  const result = elementToCampsite(
    { type: 'node', id: 7, lat: 52.9, lon: 7.5, tags: { tourism: 'caravan_site', 'addr:city': 'Werlte' } },
    52.9,
    7.5,
  );
  assert.equal(result?.name, 'Wohnmobilstellplatz Werlte');
});

test('findCampsitesNear liefert Treffer nach Entfernung sortiert', async () => {
  mockFetch([
    {
      match: (url) => url.includes('overpass'),
      body: {
        elements: [
          { type: 'node', id: 2, lat: 53.10, lon: 7.55, tags: { tourism: 'camp_site', name: 'Weit weg' } },
          { type: 'node', id: 1, lat: 52.985, lon: 7.551, tags: { tourism: 'camp_site', name: 'Ganz nah' } },
        ],
      },
    },
  ]);

  const results = await findCampsitesNear(52.98, 7.55);
  assert.equal(results.length, 2);
  assert.equal(results[0].name, 'Ganz nah');
  assert.ok(results[0].distanceMeters < results[1].distanceMeters);
});

test('findCampsitesNear zieht den Radius auf, wenn der erste leer bleibt', async () => {
  let call = 0;
  (globalThis as { fetch: unknown }).fetch = async (_url: unknown, init?: RequestInit) => {
    call += 1;
    const body = decodeURIComponent(String(init?.body));
    const elements =
      call === 1 ? [] : [{ type: 'node', id: 9, lat: 53.3, lon: 7.9, tags: { tourism: 'camp_site', name: 'Weiter weg' } }];
    assert.match(body, call === 1 ? /around:30000/ : /around:75000/);
    return { ok: true, status: 200, json: async () => ({ elements }) } as Response;
  };

  const results = await findCampsitesNear(52.98, 7.55);
  assert.equal(call, 2, 'zweiter, größerer Radius muss versucht werden');
  assert.equal(results[0].name, 'Weiter weg');
});

test('findCampsitesNear weicht auf den nächsten Server aus', async () => {
  const seen: string[] = [];
  (globalThis as { fetch: unknown }).fetch = async (url: unknown) => {
    seen.push(String(url));
    if (seen.length === 1) return { ok: false, status: 504, json: async () => ({}) } as Response;
    return {
      ok: true,
      status: 200,
      json: async () => ({ elements: [{ type: 'node', id: 1, lat: 52.98, lon: 7.55, tags: { tourism: 'camp_site', name: 'Ersatzserver' } }] }),
    } as Response;
  };

  const results = await findCampsitesNear(52.98, 7.55);
  assert.equal(seen.length, 2, 'nach 504 muss der zweite Mirror drankommen');
  assert.equal(results[0].name, 'Ersatzserver');
});

test('dedupeByLocation faltet Fläche und Punkt desselben Platzes zusammen', () => {
  const base = {
    sourceId: '', address: '', country: null, kind: 'camp_site', distanceMeters: 0,
    features: { caravans: null, tents: null, power: null, shower: null, toilets: null, drinkingWater: null, dogs: null, openAllYear: null, website: null, phone: null },
  };
  const items = [
    { ...base, sourceId: 'osm:way/1', name: 'Campingplatz de Bantus', lat: 52.9900, lon: 7.5600 },
    { ...base, sourceId: 'osm:node/2', name: 'Campingplatz de Bantus', lat: 52.9901, lon: 7.5601 },
    { ...base, sourceId: 'osm:node/3', name: 'Anderer Platz', lat: 53.2000, lon: 7.9000 },
  ] as CampsiteSuggestion[];

  const result = dedupeByLocation(items);
  assert.equal(result.length, 2);
  assert.ok(result.some((r) => r.name === 'Anderer Platz'));
});

test('formatDistance schreibt deutsche Zahlen', () => {
  assert.equal(formatDistance(120), '100 m');
  assert.equal(formatDistance(1500), '1,5 km');
  assert.equal(formatDistance(24300), '24,3 km');
});

test('distanceMeters rechnet plausibel', () => {
  // Surwold -> Werlte sind rund 20 km Luftlinie.
  const d = distanceMeters(52.985, 7.553, 52.851, 7.687);
  assert.ok(d > 15_000 && d < 25_000, `unerwartet: ${Math.round(d)} m`);
});

// ------------------------------------------------------- Zusammenspiel

test('runSearch zeigt Nominatim-Treffer, bevor Overpass fertig ist', async () => {
  mockFetch([
    {
      match: (url) => url.includes('nominatim'),
      body: [{ osm_type: 'node', osm_id: 1, name: 'Surwold', display_name: 'Surwold, Emsland', lat: '52.98', lon: '7.55', type: 'village' }],
    },
    {
      match: (url) => url.includes('overpass'),
      delayMs: 300,
      body: { elements: [{ type: 'way', id: 5, center: { lat: 52.99, lon: 7.56 }, tags: { tourism: 'camp_site', name: 'Campingplatz de Bantus' } }] },
    },
  ]);

  const updates: { places: number; nearby: number; loading: boolean }[] = [];
  runSearch('Surwold', (u) => updates.push({ places: u.places.length, nearby: u.nearby.length, loading: u.loading }));

  // Der Zwischenstand mit Ort, aber noch ohne Umkreis-Treffer, ist der
  // entscheidende Punkt: hier sieht der Nutzer schon etwas.
  await new Promise((r) => setTimeout(r, 150));
  const early = updates[updates.length - 1];
  assert.equal(early.places, 1, 'Ort muss sofort sichtbar sein');
  assert.equal(early.nearby, 0);
  assert.equal(early.loading, true);

  await new Promise((r) => setTimeout(r, 600));
  const final = updates[updates.length - 1];
  assert.equal(final.nearby, 1, 'Umkreis-Treffer muss nachgeliefert werden');
  assert.equal(final.loading, false);
});

test('runSearch zeigt Orte auch dann, wenn Overpass ausfällt', async () => {
  (globalThis as { fetch: unknown }).fetch = async (url: unknown) => {
    if (String(url).includes('nominatim')) {
      return {
        ok: true, status: 200,
        json: async () => [{ osm_type: 'node', osm_id: 1, name: 'Surwold', display_name: 'Surwold', lat: '52.98', lon: '7.55', type: 'village' }],
      } as Response;
    }
    throw new Error('Netzwerk weg');
  };

  const updates: { places: number; nearbyFailed: boolean; loading: boolean }[] = [];
  runSearch('Surwold', (u) => updates.push({ places: u.places.length, nearbyFailed: u.nearbyFailed, loading: u.loading }));

  await new Promise((r) => setTimeout(r, 900));
  const final = updates[updates.length - 1];
  assert.equal(final.places, 1, 'Nominatim-Treffer dürfen nicht mit Overpass untergehen');
  assert.equal(final.nearbyFailed, true);
  assert.equal(final.loading, false);
});

test('runSearch meldet einen Ausfall der Ortssuche, ohne hängen zu bleiben', async () => {
  (globalThis as { fetch: unknown }).fetch = async () => {
    throw new Error('Netzwerk weg');
  };

  const updates: { placesFailed: boolean; loading: boolean }[] = [];
  runSearch('Surwold', (u) => updates.push({ placesFailed: u.placesFailed, loading: u.loading }));

  await new Promise((r) => setTimeout(r, 500));
  const final = updates[updates.length - 1];
  assert.equal(final.placesFailed, true);
  assert.equal(final.loading, false, 'Ladeanzeige darf nicht ewig stehen bleiben');
});

test('runSearch bricht sauber ab und meldet danach nichts mehr', async () => {
  mockFetch([
    { match: (url) => url.includes('nominatim'), delayMs: 200, body: [] },
    { match: (url) => url.includes('overpass'), body: { elements: [] } },
  ]);

  let count = 0;
  const cancel = runSearch('Surwold', () => { count += 1; });
  const afterStart = count;
  cancel();

  await new Promise((r) => setTimeout(r, 500));
  assert.equal(count, afterStart, 'nach dem Abbruch darf kein Update mehr kommen');
});
