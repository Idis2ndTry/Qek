import { Linking, Platform } from 'react-native';

/**
 * Verknüpfungen nach draußen: Google Maps, Karten-Apps und Navigation.
 * Es wird bewusst kein Google-API-Key gebraucht - die App öffnet den
 * vollständigen Google-Eintrag einfach in Google Maps bzw. im Browser.
 */

type Target = {
  name: string;
  lat?: number | null;
  lon?: number | null;
  address?: string | null;
};

function searchTerm(target: Target): string {
  return [target.name, target.address].filter(Boolean).join(' ');
}

/**
 * Öffnet den vollständigen Google-Eintrag des Platzes - mit Fotos,
 * Öffnungszeiten, Website und den Google-Bewertungen.
 */
export async function openInGoogleMaps(target: Target): Promise<void> {
  const query = encodeURIComponent(searchTerm(target));
  const hasCoords = typeof target.lat === 'number' && typeof target.lon === 'number';

  // Die App-URL zeigt direkt auf den Ortseintrag; der Browser-Fallback
  // funktioniert auch ohne installierte Google-Maps-App.
  const appUrl = hasCoords
    ? `geo:${target.lat},${target.lon}?q=${query}`
    : `geo:0,0?q=${query}`;
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  if (Platform.OS !== 'web') {
    try {
      if (await Linking.canOpenURL(appUrl)) {
        await Linking.openURL(appUrl);
        return;
      }
    } catch {
      // Fällt unten auf den Browser zurück.
    }
  }
  await Linking.openURL(webUrl);
}

/** Startet die Navigation zum Platz. */
export async function openNavigation(target: Target): Promise<void> {
  const hasCoords = typeof target.lat === 'number' && typeof target.lon === 'number';
  const destination = hasCoords
    ? `${target.lat},${target.lon}`
    : encodeURIComponent(searchTerm(target));
  await Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
  );
}

/** Google-Suche nach dem Platz - findet Website, Preise und Erfahrungsberichte. */
export async function openGoogleSearch(target: Target): Promise<void> {
  const query = encodeURIComponent(`${searchTerm(target)} Campingplatz`);
  await Linking.openURL(`https://www.google.com/search?q=${query}`);
}

/** Der Platz auf openstreetmap.org - freie Karte mit allen Details. */
export async function openInOpenStreetMap(target: Target): Promise<void> {
  if (typeof target.lat !== 'number' || typeof target.lon !== 'number') return;
  await Linking.openURL(
    `https://www.openstreetmap.org/?mlat=${target.lat}&mlon=${target.lon}#map=16/${target.lat}/${target.lon}`,
  );
}
