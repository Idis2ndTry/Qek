import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useFocusEffect } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { scoreColor } from '@/components/ScoreBadge';
import { listPlaces } from '@/db/repository';
import type { PlaceSummary } from '@/db/types';
import { colors, spacing, type as typography } from '@/theme';
import { formatScore } from '@/utils/format';

/** Alle besuchten Plätze als Nadeln auf einer OpenStreetMap-Karte. */
export default function MapScreen() {
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      listPlaces().then((result) => {
        setPlaces(result);
        setLoading(false);
      });
    }, []),
  );

  const withCoords = useMemo(
    () => places.filter((p) => p.lat !== null && p.lon !== null),
    [places],
  );

  const html = useMemo(() => (withCoords.length > 0 ? buildMapHtml(withCoords) : null), [
    withCoords,
  ]);

  return (
    <Screen>
      <AppHeader
        title="Deine Karte"
        subtitle={
          withCoords.length > 0
            ? `${withCoords.length} ${withCoords.length === 1 ? 'Platz' : 'Plätze'} mit Standort`
            : undefined
        }
        display
      />

      {html === null ? (
        loading ? (
          <View style={styles.flex} />
        ) : (
          <EmptyState
            icon="map-outline"
            title="Noch nichts zu sehen"
            message={
              places.length > 0
                ? 'Deine Plätze haben noch keinen Standort. Trag beim Anlegen die Ortssuche mit ein, dann erscheinen sie hier.'
                : 'Sobald du deinen ersten Campingplatz einträgst, siehst du hier alle Ziele auf einen Blick.'
            }
            actionLabel={places.length === 0 ? 'Platz eintragen' : undefined}
            onAction={places.length === 0 ? () => router.push('/place/new') : undefined}
          />
        )
      ) : (
        <View style={styles.mapWrap}>
          {Platform.OS === 'web' ? (
            <iframe srcDoc={html} style={{ border: 0, width: '100%', height: '100%' }} />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled={false}
              setSupportMultipleWindows={false}
              onMessage={(event) => {
                // Die Karte meldet den angetippten Platz zurück.
                const id = Number(event.nativeEvent.data);
                if (Number.isFinite(id) && id > 0) router.push(`/place/${id}`);
              }}
            />
          )}
          <View style={styles.legend}>
            <Text style={styles.legendText}>Tippe eine Nadel an, um den Platz zu öffnen</Text>
          </View>
        </View>
      )}
    </Screen>
  );
}

function buildMapHtml(places: PlaceSummary[]): string {
  const markers = places.map((place) => ({
    id: place.id,
    lat: place.lat,
    lon: place.lon,
    name: place.name.replace(/[<>&"']/g, ''),
    score: place.overall,
    color: place.overall === null ? colors.inkFaint : scoreColor(place.overall),
    scoreLabel: place.overall === null ? 'noch nicht bewertet' : `${formatScore(place.overall)} / 5`,
  }));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:${colors.cream}; }
  .leaflet-control-attribution { font-size: 9px; }
  .qek-pin {
    width: 30px; height: 30px; border-radius: 50%;
    border: 3px solid #fff; box-shadow: 0 0 0 2px ${colors.ink};
    display:flex; align-items:center; justify-content:center;
    color:#fff; font: 700 11px/1 -apple-system, system-ui, sans-serif;
  }
  .qek-popup { font: 400 13px/1.4 -apple-system, system-ui, sans-serif; }
  .qek-popup b { display:block; font-size:14px; margin-bottom:2px; }
  .qek-popup button {
    margin-top:6px; padding:6px 12px; border:2px solid ${colors.ink};
    border-radius:6px; background:${colors.red}; color:#fff;
    font: 700 12px/1 -apple-system, system-ui, sans-serif;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var places = ${JSON.stringify(markers)};
  var map = L.map('map', { zoomControl: true, attributionControl: true });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  function openPlace(id) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(id));
  }

  var bounds = [];
  places.forEach(function (place) {
    var label = place.score === null ? '?' : place.score.toFixed(1);
    var icon = L.divIcon({
      className: '',
      html: '<div class="qek-pin" style="background:' + place.color + '">' + label + '</div>',
      iconSize: [30, 30], iconAnchor: [15, 15]
    });
    L.marker([place.lat, place.lon], { icon: icon })
      .addTo(map)
      .bindPopup(
        '<div class="qek-popup"><b>' + place.name + '</b>' + place.scoreLabel +
        '<br><button onclick="openPlace(' + place.id + ')">Platz öffnen</button></div>'
      );
    bounds.push([place.lat, place.lon]);
  });

  if (bounds.length === 1) map.setView(bounds[0], 11);
  else map.fitBounds(bounds, { padding: [45, 45] });
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  mapWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  legend: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.paper,
  },
  legendText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.ink,
  },
});
