import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';

import { AppHeader } from '@/components/AppHeader';
import { MapPreview } from '@/components/MapPreview';
import { RetroButton } from '@/components/RetroButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { createPlace, setTags } from '@/db/repository';
import { reverseGeocode, searchPlaces, type PlaceSuggestion } from '@/services/nominatim';
import {
  findCampsitesNear,
  formatDistance,
  searchCampsitesByName,
  type CampsiteSuggestion,
} from '@/services/overpass';
import { colors, fonts, radius, spacing, type as typography } from '@/theme';

type Row =
  | { kind: 'campsite'; item: CampsiteSuggestion }
  | { kind: 'place'; item: PlaceSuggestion };

type Section = {
  title: string;
  hint?: string;
  data: Row[];
};

/** Umkreis, in dem "Plätze in der Nähe" zuerst gesucht wird. */
const NEARBY_RADIUS_M = 25_000;

/**
 * Neuen Campingplatz anlegen.
 *
 * Die Suche läuft über zwei Quellen: Nominatim findet Orte und Adressen,
 * Overpass holt gezielt alles, was in OpenStreetMap als Campingplatz
 * eingetragen ist - auch kleine und namenlose. Tippt man einen Ort an,
 * listet die App alle Plätze im Umkreis auf.
 */
export default function NewPlaceScreen() {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<PlaceSuggestion | null>(null);

  const [campsites, setCampsites] = useState<CampsiteSuggestion[]>([]);
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  /** Gesetzt, solange die Umkreisliste eines Ortes angezeigt wird. */
  const [nearby, setNearby] = useState<{
    label: string;
    lat: number;
    lon: number;
    results: CampsiteSuggestion[];
  } | null>(null);
  const [loadingNearby, setLoadingNearby] = useState(false);

  const [manualPin, setManualPin] = useState<{ lat: number; lon: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Suche während des Tippens, entprellt - beide Dienste erlauben nur
  // wenige Anfragen pro Sekunde.
  useEffect(() => {
    if (selected || nearby || name.trim().length < 3) {
      if (!selected && !nearby && name.trim().length < 3) {
        setCampsites([]);
        setPlaces([]);
      }
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSearching(true);
      setSearchError(null);

      // Beide Quellen parallel: eine langsame darf die andere nicht
      // aufhalten, und ein Ausfall soll nicht die ganze Suche kippen.
      Promise.allSettled([
        searchPlaces(name, { signal: controller.signal }),
        searchCampsitesByName(name, { signal: controller.signal }),
      ])
        .then(([nominatim, overpass]) => {
          if (controller.signal.aborted) return;

          const found = overpass.status === 'fulfilled' ? overpass.value : [];
          const general = nominatim.status === 'fulfilled' ? nominatim.value : [];

          // Was Overpass schon als Campingplatz liefert, muss nicht noch
          // einmal als Adresse auftauchen.
          const seen = new Set(found.map((c) => c.sourceId));
          setCampsites(found.sort((a, b) => a.name.localeCompare(b.name, 'de')));
          setPlaces(general.filter((p) => !seen.has(p.sourceId)));

          if (nominatim.status === 'rejected' && overpass.status === 'rejected') {
            setSearchError(
              'Die Suche ist gerade nicht erreichbar. Du kannst den Platz auch ohne Standort speichern.',
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 650);

    return () => clearTimeout(timer);
  }, [name, selected, nearby]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Alle Campingplätze rund um einen Punkt laden. */
  const loadNearby = useCallback(async (label: string, lat: number, lon: number) => {
    Keyboard.dismiss();
    setLoadingNearby(true);
    setSearchError(null);
    setNearby({ label, lat, lon, results: [] });
    try {
      const results = await findCampsitesNear(lat, lon, { radiusMeters: NEARBY_RADIUS_M });
      setNearby({ label, lat, lon, results });
    } catch {
      setNearby(null);
      setSearchError('Die Umkreissuche ist gerade nicht erreichbar. Versuch es gleich noch einmal.');
    } finally {
      setLoadingNearby(false);
    }
  }, []);

  const useCurrentLocation = async () => {
    setLoadingNearby(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Standort nicht freigegeben',
          'Erlaube den Zugriff auf deinen Standort, damit die App Plätze in deiner Nähe finden kann.',
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      setLoadingNearby(false);
      await loadNearby('deinem Standort', latitude, longitude);
    } catch {
      Alert.alert('Standort nicht gefunden', 'Versuch es noch einmal oder such den Platz per Name.');
    } finally {
      setLoadingNearby(false);
    }
  };

  /** Reine Koordinaten übernehmen - für Plätze, die OSM nicht kennt. */
  const useManualPin = async () => {
    if (!manualPin) return;
    const fallback: PlaceSuggestion = {
      sourceId: '',
      name: name.trim() || 'Eigener Standort',
      address: '',
      lat: manualPin.lat,
      lon: manualPin.lon,
      country: null,
      kind: null,
    };
    setSelected(fallback);
    setManualPin(null);
    setNearby(null);

    // Adresse nachschlagen, damit der Eintrag nicht nur aus Zahlen besteht.
    try {
      const found = await reverseGeocode(manualPin.lat, manualPin.lon);
      if (found) setSelected({ ...fallback, address: found.address, country: found.country });
    } catch {
      // Ohne Adresse ist der Eintrag trotzdem brauchbar.
    }
  };

  const choose = (suggestion: PlaceSuggestion) => {
    setSelected(suggestion);
    setNearby(null);
    setManualPin(null);
    if (!name.trim() || isGenericName(name)) setName(suggestion.name);
    Keyboard.dismiss();
  };

  const save = async () => {
    const finalName = (name.trim() || selected?.name || '').trim();
    if (!finalName) {
      Alert.alert('Name fehlt', 'Gib dem Platz einen Namen, damit du ihn wiederfindest.');
      return;
    }
    setSaving(true);
    try {
      const id = await createPlace({
        name: finalName,
        address: selected?.address || null,
        lat: selected?.lat ?? null,
        lon: selected?.lon ?? null,
        sourceId: selected?.sourceId || null,
        country: selected?.country ?? null,
      });
      if (selected && 'features' in selected) {
        const tags = tagsFromFeatures(selected as CampsiteSuggestion);
        if (tags.length > 0) await setTags(id, tags);
      }
      // Direkt in den Bewertungs-Durchlauf: das ist der Kern der App.
      router.replace(`/rate/${id}`);
    } catch {
      Alert.alert('Speichern fehlgeschlagen', 'Der Platz konnte nicht angelegt werden.');
      setSaving(false);
    }
  };

  const sections = buildSections({ nearby, campsites, places });

  return (
    <Screen>
      <AppHeader title="Neuer Platz" subtitle="Schritt 1 von 2" showBack />

      <SectionList
        sections={selected ? [] : sections}
        keyExtractor={(row, index) => `${row.item.sourceId || 'x'}-${index}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <SearchHeader
            name={name}
            onChangeName={(value) => {
              setName(value);
              if (selected) setSelected(null);
              if (nearby) setNearby(null);
            }}
            searching={searching}
            selected={selected}
            onClearSelected={() => setSelected(null)}
            nearby={nearby}
            onClearNearby={() => setNearby(null)}
            loadingNearby={loadingNearby}
            onUseCurrentLocation={useCurrentLocation}
            searchError={searchError}
            hasResults={sections.some((s) => s.data.length > 0)}
          />
        }
        renderSectionHeader={({ section }) =>
          section.data.length === 0 ? null : (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
              {section.hint ? <Text style={styles.sectionHint}>{section.hint}</Text> : null}
            </View>
          )
        }
        renderItem={({ item: row }) =>
          row.kind === 'campsite' ? (
            <CampsiteRow
              item={row.item}
              showDistance={Boolean(nearby)}
              onPress={() => choose(row.item)}
            />
          ) : (
            <PlaceRow
              item={row.item}
              onPress={() => choose(row.item)}
              onShowNearby={() => loadNearby(row.item.name, row.item.lat, row.item.lon)}
            />
          )
        }
        ListFooterComponent={
          selected ? null : (
            <ManualFallback
              visible={
                name.trim().length >= 3 &&
                !searching &&
                !loadingNearby &&
                sections.every((s) => s.data.length === 0)
              }
              pin={manualPin}
              onSetPin={setManualPin}
              onConfirm={useManualPin}
            />
          )
        }
      />

      <View style={styles.footer}>
        <RetroButton
          label="Weiter zur Bewertung"
          onPress={save}
          icon="star"
          iconRight="chevron-forward"
          fullWidth
          loading={saving}
          disabled={name.trim().length === 0 && !selected}
        />
      </View>
    </Screen>
  );
}

/** Gruppiert die Treffer in die Abschnitte der Liste. */
function buildSections(input: {
  nearby: { label: string; results: CampsiteSuggestion[] } | null;
  campsites: CampsiteSuggestion[];
  places: PlaceSuggestion[];
}): Section[] {
  if (input.nearby) {
    return [
      {
        title: `Campingplätze rund um ${input.nearby.label}`,
        hint:
          input.nearby.results.length > 0
            ? `${input.nearby.results.length} Treffer im Umkreis von ${NEARBY_RADIUS_M / 1000} km`
            : undefined,
        data: input.nearby.results.map((item) => ({ kind: 'campsite' as const, item })),
      },
    ];
  }

  const sections: Section[] = [];
  if (input.campsites.length > 0) {
    sections.push({
      title: 'Campingplätze',
      data: input.campsites.map((item) => ({ kind: 'campsite' as const, item })),
    });
  }
  if (input.places.length > 0) {
    sections.push({
      title: 'Orte & Adressen',
      hint: 'Ort antippen zeigt alle Campingplätze im Umkreis',
      data: input.places.map((item) => ({ kind: 'place' as const, item })),
    });
  }
  return sections;
}

/**
 * Was OpenStreetMap über den Platz weiß, direkt als Merkmal-Chips
 * übernehmen - das spart Tipparbeit beim ersten Eintrag.
 */
function tagsFromFeatures(item: CampsiteSuggestion): string[] {
  const tags: string[] = [];
  if (item.features.caravans === true) tags.push('Wohnwagen-tauglich');
  if (item.features.power === true) tags.push('Stromanschluss');
  if (item.features.dogs === true) tags.push('Hunde erlaubt');
  if (item.features.drinkingWater === true) tags.push('Frischwasser');
  if (item.features.openAllYear === true) tags.push('Ganzjährig offen');
  return tags;
}

/** Namen, die eher ein Suchbegriff als ein Platzname sind. */
function isGenericName(value: string): boolean {
  return /^(camping|campingplatz|wohnmobil|stellplatz|platz)$/i.test(value.trim());
}

type HeaderProps = {
  name: string;
  onChangeName: (value: string) => void;
  searching: boolean;
  selected: PlaceSuggestion | null;
  onClearSelected: () => void;
  nearby: { label: string } | null;
  onClearNearby: () => void;
  loadingNearby: boolean;
  onUseCurrentLocation: () => void;
  searchError: string | null;
  hasResults: boolean;
};

function SearchHeader({
  name,
  onChangeName,
  searching,
  selected,
  onClearSelected,
  nearby,
  onClearNearby,
  loadingNearby,
  onUseCurrentLocation,
  searchError,
  hasResults,
}: HeaderProps) {
  return (
    <View style={styles.headerBlock}>
      <Text style={styles.label}>WIE HEISST DER PLATZ?</Text>
      <Surface offset={3} style={styles.inputCard}>
        <TextInput
          value={name}
          onChangeText={onChangeName}
          placeholder="Name oder Ort, z. B. Surwold"
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Name des Campingplatzes"
        />
        {searching && <ActivityIndicator size="small" color={colors.red} />}
      </Surface>

      {selected ? (
        <View style={styles.selectedBlock}>
          <View style={styles.selectedHeader}>
            <Ionicons name="location" size={16} color={colors.red} />
            <Text style={styles.selectedTitle}>Standort übernommen</Text>
            <Pressable onPress={onClearSelected} hitSlop={8} accessibilityLabel="Standort entfernen">
              <Ionicons name="close-circle" size={19} color={colors.inkFaint} />
            </Pressable>
          </View>
          {selected.address ? (
            <Text style={styles.selectedAddress}>{selected.address}</Text>
          ) : null}
          <MapPreview lat={selected.lat} lon={selected.lon} label={selected.name} height={170} />
        </View>
      ) : (
        <>
          {nearby ? (
            <Pressable
              style={styles.backToSearch}
              onPress={onClearNearby}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={16} color={colors.red} />
              <Text style={styles.backToSearchText}>Zurück zur Suche</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.locationRow}
              onPress={onUseCurrentLocation}
              disabled={loadingNearby}
              accessibilityRole="button"
              accessibilityLabel="Campingplätze in meiner Nähe suchen"
            >
              {loadingNearby ? (
                <ActivityIndicator size="small" color={colors.red} />
              ) : (
                <Ionicons name="navigate-circle-outline" size={22} color={colors.red} />
              )}
              <Text style={styles.locationText}>
                {loadingNearby ? 'Suche läuft …' : 'Plätze in meiner Nähe'}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
            </Pressable>
          )}

          {loadingNearby && nearby ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={colors.red} />
              <Text style={styles.hint}>Campingplätze im Umkreis werden geladen …</Text>
            </View>
          ) : searchError ? (
            <Text style={styles.error}>{searchError}</Text>
          ) : !hasResults && name.trim().length < 3 ? (
            <Text style={styles.hint}>
              Tipp den Namen des Platzes ein – oder einfach den Ort, dann zeigt dir die App alle
              Campingplätze in der Umgebung.
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

function CampsiteRow({
  item,
  showDistance,
  onPress,
}: {
  item: CampsiteSuggestion;
  showDistance: boolean;
  onPress: () => void;
}) {
  const badges: string[] = [];
  if (item.features.caravans === true) badges.push('Wohnwagen');
  if (item.features.power === true) badges.push('Strom');
  if (item.features.shower === true) badges.push('Dusche');
  if (item.features.dogs === true) badges.push('Hunde');

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${item.address ? `, ${item.address}` : ''}`}
    >
      <View style={[styles.rowIcon, styles.rowIconCamp]}>
        <Ionicons
          name={item.kind === 'caravan_site' ? 'bus-outline' : 'bonfire-outline'}
          size={17}
          color={colors.red}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.address ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            {item.address}
          </Text>
        ) : null}
        {badges.length > 0 && (
          <Text style={styles.rowBadges} numberOfLines={1}>
            {badges.join(' · ')}
          </Text>
        )}
      </View>
      {showDistance && <Text style={styles.distance}>{formatDistance(item.distanceMeters)}</Text>}
    </Pressable>
  );
}

function PlaceRow({
  item,
  onPress,
  onShowNearby,
}: {
  item: PlaceSuggestion;
  onPress: () => void;
  onShowNearby: () => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onShowNearby}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. Campingplätze im Umkreis anzeigen`}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="location-outline" size={17} color={colors.inkSoft} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={2}>
          {item.address}
        </Text>
      </View>
      <Pressable
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Diesen Ort direkt übernehmen"
        style={styles.rowTake}
      >
        <Ionicons name="checkmark-circle-outline" size={21} color={colors.inkFaint} />
      </Pressable>
    </Pressable>
  );
}

function ManualFallback({
  visible,
  pin,
  onSetPin,
  onConfirm,
}: {
  visible: boolean;
  pin: { lat: number; lon: number } | null;
  onSetPin: (pin: { lat: number; lon: number }) => void;
  onConfirm: () => void;
}) {
  if (!visible) return null;

  // Startpunkt der Karte: Mitte Deutschlands, wenn noch nichts gesetzt ist.
  const lat = pin?.lat ?? 51.2;
  const lon = pin?.lon ?? 9.5;

  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackTitle}>Nichts gefunden?</Text>
      <Text style={styles.hint}>
        Manche kleinen Plätze fehlen in OpenStreetMap. Tippe den Standort einfach selbst auf der
        Karte an – zoomen und verschieben geht mit zwei Fingern.
      </Text>
      <MapPreview
        lat={lat}
        lon={lon}
        label="Standort wählen"
        height={230}
        zoom={pin ? 14 : 5}
        onPick={(pickedLat, pickedLon) => onSetPin({ lat: pickedLat, lon: pickedLon })}
      />
      <RetroButton
        label={pin ? 'Diesen Standort übernehmen' : 'Erst auf der Karte antippen'}
        onPress={onConfirm}
        variant="secondary"
        icon="pin"
        fullWidth
        disabled={!pin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.inkSoft,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.redWash,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  locationText: {
    ...typography.bodyStrong,
    flex: 1,
    color: colors.ink,
  },
  backToSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  backToSearchText: {
    ...typography.label,
    color: colors.red,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.inkSoft,
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: colors.redDark,
  },
  selectedBlock: {
    gap: spacing.sm,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedTitle: {
    ...typography.label,
    flex: 1,
    color: colors.red,
  },
  selectedAddress: {
    ...typography.caption,
    color: colors.inkSoft,
  },
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.inkSoft,
  },
  sectionHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconCamp: {
    borderColor: colors.ink,
    backgroundColor: colors.redWash,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  rowSub: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 1,
  },
  rowBadges: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.mint,
    marginTop: 2,
  },
  rowTake: {
    padding: 2,
  },
  distance: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: colors.red,
  },
  fallback: {
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  fallbackTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    backgroundColor: colors.paper,
  },
});
