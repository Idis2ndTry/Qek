import { useEffect, useRef, useState } from 'react';
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
import { MapPreview } from '@/components/MapPreview';
import { RetroButton } from '@/components/RetroButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { createPlace } from '@/db/repository';
import { reverseGeocode, searchPlaces, type PlaceSuggestion } from '@/services/nominatim';
import { colors, fonts, radius, spacing, type as typography } from '@/theme';

/**
 * Neuen Campingplatz anlegen.
 *
 * Der Name reicht - Standort und Adresse holt sich die App per Ortssuche
 * aus OpenStreetMap oder direkt aus dem aktuellen GPS-Standort.
 */
export default function NewPlaceScreen() {
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selected, setSelected] = useState<PlaceSuggestion | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Suche während des Tippens, aber entprellt - Nominatim erlaubt nur
  // etwa eine Anfrage pro Sekunde.
  useEffect(() => {
    if (selected || name.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSearching(true);
      setSearchError(null);
      searchPlaces(name, { signal: controller.signal })
        .then((results) => {
          if (!controller.signal.aborted) setSuggestions(results);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setSearchError(
            error instanceof Error && error.message.includes('Network')
              ? 'Keine Verbindung – du kannst den Platz auch ohne Standort speichern.'
              : 'Die Ortssuche ist gerade nicht erreichbar.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 600);

    return () => clearTimeout(timer);
  }, [name, selected]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Standort nicht freigegeben',
          'Erlaube den Zugriff auf deinen Standort, damit die App den Platz automatisch findet.',
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const found = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      if (found) {
        setSelected(found);
        if (!name.trim()) setName(found.name);
        Keyboard.dismiss();
      } else {
        // Ohne Adresse trotzdem die reinen Koordinaten übernehmen.
        setSelected({
          sourceId: '',
          name: name.trim() || 'Aktueller Standort',
          address: '',
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          country: null,
          kind: null,
        });
      }
    } catch {
      Alert.alert('Standort nicht gefunden', 'Versuch es nochmal oder such den Platz per Name.');
    } finally {
      setLocating(false);
    }
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
        address: selected?.address ?? null,
        lat: selected?.lat ?? null,
        lon: selected?.lon ?? null,
        sourceId: selected?.sourceId || null,
        country: selected?.country ?? null,
      });
      // Direkt in den Bewertungs-Durchlauf: das ist der Kern der App.
      router.replace(`/rate/${id}`);
    } catch {
      Alert.alert('Speichern fehlgeschlagen', 'Der Platz konnte nicht angelegt werden.');
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppHeader title="Neuer Platz" subtitle="Schritt 1 von 2" showBack />

      <FlatList
        data={selected ? [] : suggestions}
        keyExtractor={(item, index) => `${item.sourceId || 'x'}-${index}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.label}>WIE HEISST DER PLATZ?</Text>
            <Surface offset={3} style={styles.inputCard}>
              <TextInput
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  if (selected) setSelected(null);
                }}
                placeholder="z. B. Campingplatz Timmeler Meer"
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
                  <Pressable
                    onPress={() => setSelected(null)}
                    hitSlop={8}
                    accessibilityLabel="Standort entfernen"
                  >
                    <Ionicons name="close-circle" size={19} color={colors.inkFaint} />
                  </Pressable>
                </View>
                {selected.address ? (
                  <Text style={styles.selectedAddress}>{selected.address}</Text>
                ) : null}
                <MapPreview
                  lat={selected.lat}
                  lon={selected.lon}
                  label={selected.name}
                  height={170}
                />
              </View>
            ) : (
              <>
                <Pressable
                  style={styles.locationRow}
                  onPress={useCurrentLocation}
                  disabled={locating}
                  accessibilityRole="button"
                  accessibilityLabel="Aktuellen Standort verwenden"
                >
                  {locating ? (
                    <ActivityIndicator size="small" color={colors.red} />
                  ) : (
                    <Ionicons name="navigate-circle-outline" size={22} color={colors.red} />
                  )}
                  <Text style={styles.locationText}>
                    {locating ? 'Standort wird gesucht …' : 'Ich stehe gerade hier'}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
                </Pressable>

                {searchError ? (
                  <Text style={styles.error}>{searchError}</Text>
                ) : suggestions.length > 0 ? (
                  <Text style={styles.hint}>Treffer aus OpenStreetMap – tippe deinen Platz an:</Text>
                ) : name.trim().length >= 3 && !searching ? (
                  <Text style={styles.hint}>
                    Kein Treffer. Kein Problem – du kannst den Platz auch ohne Standort speichern.
                  </Text>
                ) : (
                  <Text style={styles.hint}>
                    Tipp den Namen ein – die App sucht den Platz automatisch und trägt Adresse und
                    Karte für dich ein.
                  </Text>
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.suggestion}
            onPress={() => {
              setSelected(item);
              if (!name.trim() || name.trim().length < item.name.length) setName(item.name);
              Keyboard.dismiss();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.address}`}
          >
            <View style={styles.suggestionIcon}>
              <Ionicons
                name={isCampsite(item.kind) ? 'bonfire-outline' : 'location-outline'}
                size={17}
                color={isCampsite(item.kind) ? colors.red : colors.inkSoft}
              />
            </View>
            <View style={styles.suggestionText}>
              <Text style={styles.suggestionName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.suggestionAddress} numberOfLines={2}>
                {item.address}
              </Text>
            </View>
          </Pressable>
        )}
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

function isCampsite(kind: string | null): boolean {
  return kind === 'camp_site' || kind === 'caravan_site' || kind === 'camp_pitch';
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerBlock: {
    gap: spacing.md,
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
  hint: {
    ...typography.caption,
    color: colors.inkSoft,
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
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  suggestionAddress: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 1,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    backgroundColor: colors.paper,
  },
});
