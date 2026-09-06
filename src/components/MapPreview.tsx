import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, type as typography } from '@/theme';

type Props = {
  lat: number | null;
  lon: number | null;
  label: string;
  height?: number;
  zoom?: number;
  /** Karte reagiert auf Gesten. In Listen besser aus, damit man scrollen kann. */
  interactive?: boolean;
  /**
   * Wenn gesetzt, darf in die Karte getippt werden, um einen Standort von
   * Hand zu setzen - der Ausweg für Plätze, die in OpenStreetMap fehlen.
   */
  onPick?: (lat: number, lon: number) => void;
};

/**
 * Kartenausschnitt auf Basis von OpenStreetMap.
 *
 * Bewusst per Leaflet in einer WebView statt mit react-native-maps: so
 * braucht die App keinen Google-Maps-Schlüssel und keine Abrechnung -
 * für den vollständigen Google-Eintrag gibt es daneben den Direktlink.
 */
export function MapPreview({
  lat,
  lon,
  label,
  height = 180,
  zoom = 14,
  interactive = false,
  onPick,
}: Props) {
  const pickable = Boolean(onPick);
  const html = useMemo(
    () =>
      lat !== null && lon !== null
        ? buildHtml(lat, lon, label, zoom, interactive || pickable, pickable)
        : null,
    [lat, lon, label, zoom, interactive, pickable],
  );

  if (html === null) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Ionicons name="map-outline" size={26} color={colors.inkFaint} />
        <Text style={styles.placeholderText}>Kein Standort hinterlegt</Text>
      </View>
    );
  }

  // Auf dem Web rendert eine WebView nicht; dort zeigen wir ein iframe.
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.frame, { height }]}>
        <iframe srcDoc={html} style={{ border: 0, width: '100%', height: '100%' }} />
      </View>
    );
  }

  return (
    <View style={[styles.frame, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        scalesPageToFit={false}
        javaScriptEnabled
        domStorageEnabled={false}
        androidLayerType="hardware"
        // Ohne diese Sperre würde ein Tipp in die Karte die WebView
        // navigieren lassen, statt den Platz-Screen zu behalten.
        setSupportMultipleWindows={false}
        onMessage={(event) => {
          if (!onPick) return;
          const [pickedLat, pickedLon] = event.nativeEvent.data.split(',').map(Number);
          if (Number.isFinite(pickedLat) && Number.isFinite(pickedLon)) {
            onPick(pickedLat, pickedLon);
          }
        }}
      />
      {!interactive && !pickable && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-only" />
      )}
    </View>
  );
}

function buildHtml(
  lat: number,
  lon: number,
  label: string,
  zoom: number,
  interactive: boolean,
  pickable: boolean,
): string {
  const safeLabel = label.replace(/[<>&"']/g, '');
  const controls = interactive ? 'true' : 'false';

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
    width: 26px; height: 26px; border-radius: 50%;
    background: ${colors.red}; border: 3px solid #fff;
    box-shadow: 0 0 0 2px ${colors.ink};
  }
  .qek-msg {
    display:flex; align-items:center; justify-content:center;
    height:100%; padding:0 18px; text-align:center;
    font: 400 13px/1.5 -apple-system, system-ui, sans-serif; color:${colors.inkSoft};
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  // Ohne Netz laedt Leaflet nicht - dann eine Erklaerung zeigen statt
  // einer leeren weissen Flaeche.
  if (typeof L === 'undefined') {
    document.getElementById('map').innerHTML =
      '<div class="qek-msg">Karte konnte nicht geladen werden.<br>Pr&uuml;fe deine Internetverbindung.</div>';
  } else {
  var map = L.map('map', {
    zoomControl: ${controls},
    dragging: ${controls},
    scrollWheelZoom: false,
    doubleClickZoom: ${controls},
    touchZoom: ${controls},
    attributionControl: true
  }).setView([${lat}, ${lon}], ${zoom});

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  var icon = L.divIcon({ className: '', html: '<div class="qek-pin"></div>', iconSize: [26,26], iconAnchor: [13,13] });
  var marker = L.marker([${lat}, ${lon}], { icon: icon }).addTo(map).bindPopup(${JSON.stringify(safeLabel)});

  if (${pickable ? 'true' : 'false'}) {
    map.on('click', function (event) {
      marker.setLatLng(event.latlng);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(event.latlng.lat + ',' + event.latlng.lng);
      }
    });
  }
  }
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.cream,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  placeholder: {
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    borderStyle: 'dashed',
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: {
    ...typography.caption,
    color: colors.inkSoft,
  },
});
