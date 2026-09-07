import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { buildShareMessage, buildMapsUrl, starLine } from '../shareMessage';
import type { PlaceWithDetails } from '../../db/types';

function place(over: Partial<PlaceWithDetails> = {}): PlaceWithDetails {
  return {
    id: 1,
    name: 'Campingplatz Timmeler Meer',
    address: 'Am Meer 1, 26629 Großefehn',
    lat: 53.421,
    lon: 7.533,
    sourceId: 'osm:way/2',
    country: 'Deutschland',
    visitedFrom: '2026-07-04',
    visitedTo: '2026-07-07',
    nights: 3,
    pricePerNight: 24.5,
    notes: 'Schöner Platz direkt am Wasser.',
    favorite: true,
    wouldReturn: true,
    createdAt: '2026-07-08T10:00:00.000Z',
    updatedAt: '2026-07-08T10:00:00.000Z',
    ratings: { size: 4, sanitary: 5, price: 3 },
    tags: ['Am Wasser'],
    photos: [],
    photoCount: 0,
    overall: 4.1,
    ...over,
  };
}

test('starLine schreibt volle und leere Sterne', () => {
  assert.equal(starLine(3), '★★★☆☆');
  assert.equal(starLine(5), '★★★★★');
  assert.equal(starLine(1), '★☆☆☆☆');
});

test('die Nachricht enthält Name, Note und Einzelbewertungen', () => {
  const text = buildShareMessage(place());

  assert.match(text, /Campingplatz Timmeler Meer/);
  assert.match(text, /4,1 von 5 Sternen/);
  assert.match(text, /Größe & Stellplatz/);
  assert.match(text, /Sanitäranlagen/);
  // Nicht bewertete Kategorien haben in der Nachricht nichts verloren.
  assert.doesNotMatch(text, /WLAN & Empfang/);
});

test('die Nachricht nennt Reisedaten, Preis und den eigenen Text', () => {
  const text = buildShareMessage(place());

  assert.match(text, /4\.–7\. Juli 2026/);
  assert.match(text, /3 Nächte/);
  assert.match(text, /24,50 €/);
  assert.match(text, /Schöner Platz direkt am Wasser/);
});

test('die Nachricht endet mit dem Hinweis auf die App', () => {
  const text = buildShareMessage(place());
  assert.match(text, /Reise-Tagebuch/);
  assert.match(text, /@Qek_to_the_Future/);
});

test('ein unbewerteter Platz bleibt eine sinnvolle Nachricht', () => {
  const text = buildShareMessage(place({ overall: null, ratings: {}, notes: null }));

  assert.match(text, /Campingplatz Timmeler Meer/);
  assert.doesNotMatch(text, /von 5 Sternen/);
  assert.match(text, /Reise-Tagebuch/);
});

test('der Kartenlink nutzt die Koordinaten, sonst den Namen', () => {
  assert.equal(
    buildMapsUrl({ name: 'X', address: null, lat: 53.421, lon: 7.533 }),
    'https://www.google.com/maps/search/?api=1&query=53.421,7.533',
  );
  const byName = buildMapsUrl({ name: 'Camping Süd', address: 'Musterort', lat: null, lon: null });
  assert.match(byName ?? '', /query=Camping%20S%C3%BCd%20Musterort/);
  assert.equal(buildMapsUrl({ name: '', address: null, lat: null, lon: null }), null);
});

test('ein Platz ohne Standort bekommt keinen leeren Kartenlink', () => {
  const text = buildShareMessage(place({ lat: null, lon: null, address: null, name: 'Wiese' }));
  // Ohne Koordinaten wird über den Namen verlinkt - aber niemals mit
  // leerem Suchbegriff.
  assert.doesNotMatch(text, /query=$/m);
});
