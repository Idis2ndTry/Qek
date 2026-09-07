import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';

import { AppHeader } from '@/components/AppHeader';
import { AddressLookup } from '@/components/AddressLookup';
import { MapPreview } from '@/components/MapPreview';
import { RetroButton } from '@/components/RetroButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { createPlace, setTags } from '@/db/repository';
import { reverseGeocode, type PlaceSuggestion } from '@/services/nominatim';
import { formatDistance, type CampsiteSuggestion } from '@/services/overpass';
import { EMPTY_SEARCH, runSearch, searchAround, type SearchUpdate } from '@/services/campsiteSearch';
import { colors, fonts, radius, spacing, type as typography } from '@/theme';

/** Wartezeit nach dem letzten Tastendruck, bevor gesucht wird. */
const DEBOUNCE_MS = 450;
/** Radien für "weiter weg suchen". */
const WIDER_RADII = [150_000];

/**
 * Neuen Campingplatz anlegen.
 *
 * Die Liste zeigt ausschließlich Campingplätze - Orte tauchen nur als
 * Suchmittelpunkt im Hinweis auf. Findet keine Quelle den Platz, lässt er
 * sich unten von Hand eintragen.
 */
export default function NewPlaceScreen() {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<PlaceSuggestion | null>(null);
  const [result, setResult] = useState<SearchUpdate>(EMPTY_SEARCH);

  /** Ergebnisse einer reinen Umkreissuche (GPS oder "weiter weg"). */
  const [aroundMode, setAroundMode] = useState<{
    label: string;
    lat: number;
    lon: number;
    results: CampsiteSuggestion[];
    loading: boolean;
    failed: boolean;
    wide: boolean;
  } | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualPin, setManualPin] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const cancelRef = useRef<(() => void) | null>(null);
  const aroundAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (selected || aroundMode) return;

    const query = name.trim();
    if (query.length < 2) {
      cancelRef.current?.();
      setResult(EMPTY_SEARCH);
      return;
    }

    const timer = setTimeout(() => {
      cancelRef.current?.();
      cancelRef.current = runSearch(query, setResult);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [name, selected, aroundMode]);

  useEffect(
    () => () => {
      cancelRef.current?.();
      aroundAbort.current?.abort();
    },
    [],
  );

  /** Reine Umkreissuche um einen Punkt. */
  const loadAround = useCallback(
    async (label: string, lat: number, lon: number, wide = false) => {
      Keyboard.dismiss();
      cancelRef.current?.();
      aroundAbort.current?.abort();

      const controller = new AbortController();
      aroundAbort.current = controller;
      setAroundMode({ label, lat, lon, results: [], loading: true, failed: false, wide });

      try {
        const results = await searchAround(lat, lon, {
          signal: controller.signal,
          radiiMeters: wide ? WIDER_RADII : undefined,
        });
        if (controller.signal.aborted) return;
        setAroundMode({ label, lat, lon, results, loading: false, failed: false, wide });
      } catch {
        if (controller.signal.aborted) return;
        setAroundMode({ label, lat, lon, results: [], loading: false, failed: true, wide });
      }
    },
    [],
  );

  const useCurrentLocation = async () => {
    setLocating(true);
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
      await loadAround('deinem Standort', position.coords.latitude, position.coords.longitude);
    } catch {
      Alert.alert('Standort nicht gefunden', 'Versuch es noch einmal oder such den Platz per Name.');
    } finally {
      setLocating(false);
    }
  };

  /** Reine Koordinaten übernehmen - für Plätze, die OSM nicht kennt. */
  const useManualPin = async () => {
    if (!manualPin) return;
    const fallback: PlaceSuggestion = {
      sourceId: '',
      name: name.trim() || 'Eigener Platz',
      address: '',
      lat: manualPin.lat,
      lon: manualPin.lon,
      country: null,
      kind: null,
    };
    setSelected(fallback);
    setManualOpen(false);
    setManualPin(null);
    setAroundMode(null);

    try {
      const found = await reverseGeocode(manualPin.lat, manualPin.lon);
      if (found) setSelected({ ...fallback, address: found.address, country: found.country });
    } catch {
      // Ohne Adresse ist der Eintrag trotzdem brauchbar.
    }
  };

  /** Platz ganz ohne Standort anlegen - der letzte Ausweg. */
  const useWithoutLocation = () => {
    if (!name.trim()) {
      Alert.alert('Name fehlt', 'Gib dem Platz zuerst einen Namen.');
      return;
    }
    setSelected({
      sourceId: '',
      name: name.trim(),
      address: '',
      lat: null as unknown as number,
      lon: null as unknown as number,
      country: null,
      kind: null,
    });
    setManualOpen(false);
    setAroundMode(null);
    Keyboard.dismiss();
  };

  const choose = (suggestion: PlaceSuggestion) => {
    cancelRef.current?.();
    aroundAbort.current?.abort();
    setSelected(suggestion);
    setAroundMode(null);
    setManualOpen(false);
    setManualPin(null);
    if (!name.trim() || isGenericName(name)) setName(suggestion.name);
    Keyboard.dismiss();
  };

  const backToSearch = () => {
    aroundAbort.current?.abort();
    setAroundMode(null);
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

  const list = aroundMode ? aroundMode.results : result.campsites;
  const busy = aroundMode ? aroundMode.loading : result.loading;
  const query = name.trim();
  const searched = aroundMode !== null || query.length >= 2;

  return (
    <Screen>
      <AppHeader title="Neuer Platz" subtitle="Schritt 1 von 2" showBack />

      <FlatList
        data={selected ? [] : list}
        keyExtractor={(item, index) => `${item.sourceId || 'x'}-${index}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <SearchHeader
            name={name}
            onChangeName={(value) => {
              setName(value);
              if (selected) setSelected(null);
              if (aroundMode) backToSearch();
              if (manualOpen) setManualOpen(false);
            }}
            busy={busy}
            selected={selected}
            onClearSelected={() => setSelected(null)}
            aroundLabel={aroundMode?.label ?? null}
            onBackToSearch={backToSearch}
            locating={locating}
            onUseCurrentLocation={useCurrentLocation}
            result={result}
            aroundFailed={aroundMode?.failed ?? false}
            count={list.length}
            searched={searched}
            queryLength={query.length}
          />
        }
        renderItem={({ item }) => <CampsiteRow item={item} onPress={() => choose(item)} />}
        ListFooterComponent={
          selected ? null : (
            <NotFoundBlock
              // Der Ausweg ist immer erreichbar - auch wenn Treffer da sind,
              // aber der eigene Platz nicht dabei ist.
              visible={searched && !busy}
              hadResults={list.length > 0}
              open={manualOpen}
              onToggle={() => setManualOpen((v) => !v)}
              pin={manualPin}
              onSetPin={setManualPin}
              onConfirmPin={useManualPin}
              onAddressResolved={choose}
              onWithoutLocation={useWithoutLocation}
              canWidenSearch={Boolean(aroundMode) && !aroundMode?.wide}
              onWidenSearch={() =>
                aroundMode && loadAround(aroundMode.label, aroundMode.lat, aroundMode.lon, true)
              }
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

/**
 * Was OpenStreetMap über den Platz weiß, direkt als Merkmal-Chips
 * übernehmen - das spart Tipparbeit beim ersten Eintrag.
 */
export function tagsFromFeatures(item: CampsiteSuggestion): string[] {
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
  busy: boolean;
  selected: PlaceSuggestion | null;
  onClearSelected: () => void;
  aroundLabel: string | null;
  onBackToSearch: () => void;
  locating: boolean;
  onUseCurrentLocation: () => void;
  result: SearchUpdate;
  aroundFailed: boolean;
  count: number;
  searched: boolean;
  queryLength: number;
};

function SearchHeader({
  name,
  onChangeName,
  busy,
  selected,
  onClearSelected,
  aroundLabel,
  onBackToSearch,
  locating,
  onUseCurrentLocation,
  result,
  aroundFailed,
  count,
  searched,
  queryLength,
}: HeaderProps) {
  const hasCoords = selected && Number.isFinite(selected.lat) && Number.isFinite(selected.lon);

  return (
    <View style={styles.headerBlock}>
      <Text style={styles.label}>WIE HEISST DER PLATZ?</Text>
      <Surface offset={3} style={styles.inputCard}>
        <TextInput
          value={name}
          onChangeText={onChangeName}
          placeholder="Name oder Ort, z. B. Timmeler Meer"
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Name des Campingplatzes"
        />
        {busy && <ActivityIndicator size="small" color={colors.red} />}
      </Surface>

      {selected ? (
        <View style={styles.selectedBlock}>
          <View style={styles.selectedHeader}>
            <Ionicons name="checkmark-circle" size={16} color={colors.mint} />
            <Text style={styles.selectedTitle}>
              {hasCoords ? 'Standort übernommen' : 'Platz ohne Standort'}
            </Text>
            <Pressable onPress={onClearSelected} hitSlop={8} accessibilityLabel="Auswahl aufheben">
              <Ionicons name="close-circle" size={19} color={colors.inkFaint} />
            </Pressable>
          </View>
          {selected.address ? (
            <Text style={styles.selectedAddress}>{selected.address}</Text>
          ) : null}
          {hasCoords ? (
            <MapPreview lat={selected.lat} lon={selected.lon} label={selected.name} height={170} />
          ) : (
            <Text style={styles.hint}>
              Du kannst den Standort später jederzeit ergänzen – tippe im Platz auf „Bearbeiten".
            </Text>
          )}
        </View>
      ) : (
        <>
          {aroundLabel ? (
            <Pressable style={styles.backRow} onPress={onBackToSearch} accessibilityRole="button">
              <Ionicons name="arrow-back" size={16} color={colors.red} />
              <Text style={styles.backText}>Zurück zur Namenssuche</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.locationRow}
              onPress={onUseCurrentLocation}
              disabled={locating}
              accessibilityRole="button"
              accessibilityLabel="Campingplätze in meiner Nähe suchen"
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.red} />
              ) : (
                <Ionicons name="navigate-circle-outline" size={22} color={colors.red} />
              )}
              <Text style={styles.locationText}>
                {locating ? 'Standort wird gesucht …' : 'Plätze in meiner Nähe'}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
            </Pressable>
          )}

          <StatusLine
            busy={busy}
            aroundLabel={aroundLabel}
            result={result}
            aroundFailed={aroundFailed}
            count={count}
            searched={searched}
            queryLength={queryLength}
          />
        </>
      )}
    </View>
  );
}

/** Sagt in einer Zeile, was die Suche gerade tut oder gefunden hat. */
function StatusLine({
  busy,
  aroundLabel,
  result,
  aroundFailed,
  count,
  searched,
  queryLength,
}: {
  busy: boolean;
  aroundLabel: string | null;
  result: SearchUpdate;
  aroundFailed: boolean;
  count: number;
  searched: boolean;
  queryLength: number;
}) {
  if (busy) {
    return (
      <View style={styles.statusRow}>
        <ActivityIndicator size="small" color={colors.red} />
        <Text style={styles.hint}>
          {aroundLabel
            ? `Plätze rund um ${aroundLabel} werden gesucht …`
            : count > 0
              ? 'Es wird noch in der Umgebung gesucht …'
              : 'Suche läuft …'}
        </Text>
      </View>
    );
  }

  if (aroundFailed || (result.nameFailed && result.nearbyFailed)) {
    return (
      <Text style={styles.error}>
        Die Suche ist gerade nicht erreichbar. Prüfe die Internetverbindung – oder trag den Platz
        unten von Hand ein.
      </Text>
    );
  }

  if (queryLength > 0 && queryLength < 2) {
    return <Text style={styles.hint}>Noch ein Buchstabe, dann geht die Suche los.</Text>;
  }

  if (!searched) {
    return (
      <Text style={styles.hint}>
        Tipp den Namen des Platzes ein – oder einfach den Ort, dann zeigt dir die App alle
        Campingplätze in der Umgebung.
      </Text>
    );
  }

  if (count > 0) {
    const where = aroundLabel ?? result.anchorLabel;
    return (
      <Text style={styles.hint}>
        {count} {count === 1 ? 'Platz' : 'Plätze'} gefunden
        {where ? ` – gesucht wurde auch rund um ${where}` : ''}
      </Text>
    );
  }

  return <Text style={styles.hint}>Kein Campingplatz gefunden.</Text>;
}

function CampsiteRow({ item, onPress }: { item: CampsiteSuggestion; onPress: () => void }) {
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
      <View style={styles.rowIcon}>
        <Ionicons
          name={item.kind === 'caravan_site' ? 'bus-outline' : 'bonfire-outline'}
          size={17}
          color={colors.red}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={2}>
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
      {Number.isFinite(item.distanceMeters) && (
        <Text style={styles.distance}>{formatDistance(item.distanceMeters)}</Text>
      )}
    </Pressable>
  );
}

/**
 * Der Ausweg, wenn der eigene Platz nicht in der Liste steht - egal ob die
 * Suche leer blieb oder nur den falschen Platz gefunden hat.
 */
function NotFoundBlock({
  visible,
  hadResults,
  open,
  onToggle,
  pin,
  onSetPin,
  onConfirmPin,
  onAddressResolved,
  onWithoutLocation,
  canWidenSearch,
  onWidenSearch,
}: {
  visible: boolean;
  hadResults: boolean;
  open: boolean;
  onToggle: () => void;
  pin: { lat: number; lon: number } | null;
  onSetPin: (pin: { lat: number; lon: number }) => void;
  onConfirmPin: () => void;
  onAddressResolved: (result: PlaceSuggestion) => void;
  onWithoutLocation: () => void;
  canWidenSearch: boolean;
  onWidenSearch: () => void;
}) {
  if (!visible) return null;

  const lat = pin?.lat ?? 51.2;
  const lon = pin?.lon ?? 9.5;

  return (
    <View style={styles.notFound}>
      {canWidenSearch && (
        <Pressable style={styles.widenRow} onPress={onWidenSearch} accessibilityRole="button">
          <Ionicons name="resize-outline" size={17} color={colors.red} />
          <Text style={styles.widenText}>Weiter weg suchen</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.notFoundHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.red} />
        <View style={styles.rowText}>
          <Text style={styles.notFoundTitle}>
            {hadResults ? 'Dein Platz ist nicht dabei?' : 'Nicht gefunden?'}
          </Text>
          <Text style={styles.rowSub}>Hier kannst du den Platz von Hand hinzufügen</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkSoft} />
      </Pressable>

      {open && (
        <View style={styles.manualBody}>
          {/* Der bequemste Weg zuerst: Adresse tippen statt auf der Karte
              suchen. Die Karte bleibt als Rückfallebene darunter. */}
          <AddressLookup onResolved={onAddressResolved} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>oder auf der Karte</Text>
            <View style={styles.dividerLine} />
          </View>

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
            onPress={onConfirmPin}
            variant="secondary"
            icon="pin"
            fullWidth
            disabled={!pin}
          />
          <RetroButton
            label="Ganz ohne Standort anlegen"
            onPress={onWithoutLocation}
            variant="ghost"
            icon="create-outline"
            fullWidth
          />
        </View>
      )}
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  backText: {
    ...typography.label,
    color: colors.red,
  },
  statusRow: {
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
    color: colors.ink,
  },
  selectedAddress: {
    ...typography.caption,
    color: colors.inkSoft,
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
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.redWash,
    alignItems: 'center',
    justifyContent: 'center',
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
  distance: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: colors.red,
  },
  notFound: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  widenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  widenText: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.red,
  },
  notFoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  notFoundTitle: {
    ...typography.h3,
    fontSize: 15,
    color: colors.ink,
  },
  manualBody: {
    gap: spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    ...typography.label,
    fontSize: 10,
    color: colors.inkFaint,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    backgroundColor: colors.paper,
  },
});
