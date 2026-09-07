import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RetroButton } from './RetroButton';
import { Surface } from './Surface';
import { searchPlaces, type PlaceSuggestion } from '@/services/nominatim';
import { colors, fonts, radius, spacing, type as typography } from '@/theme';

type Props = {
  /** Vorbelegung, z. B. die schon gespeicherte Adresse. */
  initialValue?: string;
  /** Wird aufgerufen, sobald ein Treffer übernommen wurde. */
  onResolved: (result: PlaceSuggestion) => void;
  label?: string;
  hint?: string;
};

/**
 * Adresse eintippen, Standort dazu finden.
 *
 * Der bequemere Weg als das Antippen auf der Karte: Straße und Ort
 * eingeben, die App schlägt passende Treffer vor und übernimmt daraus
 * Koordinaten und vollständige Adresse.
 */
export function AddressLookup({
  initialValue = '',
  onResolved,
  label = 'ADRESSE EINGEBEN',
  hint = 'Straße, Postleitzahl und Ort – je genauer, desto besser der Treffer.',
}: Props) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const lookup = async () => {
    const term = query.trim();
    if (term.length < 3) {
      setError('Bitte gib mindestens Ort oder Straße ein.');
      return;
    }
    setSearching(true);
    setError(null);
    setSearched(true);
    try {
      const found = await searchPlaces(term, { limit: 8 });
      setResults(found);
      if (found.length === 0) {
        setError('Zu dieser Adresse wurde nichts gefunden. Versuch es ohne Hausnummer.');
      }
    } catch {
      setResults([]);
      setError('Die Adresssuche ist gerade nicht erreichbar.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Surface offset={3} style={styles.inputCard}>
        <TextInput
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setError(null);
          }}
          onSubmitEditing={lookup}
          placeholder="z. B. Zum Bantus 1, 26903 Surwold"
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Adresse des Platzes"
        />
        {searching && <ActivityIndicator size="small" color={colors.red} />}
      </Surface>

      <RetroButton
        label="Adresse suchen"
        onPress={lookup}
        variant="secondary"
        icon="search"
        fullWidth
        loading={searching}
        disabled={query.trim().length < 3}
      />

      {error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.hint}>{hint}</Text>}

      {results.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsLabel}>
            {results.length === 1 ? 'Ein Treffer' : `${results.length} Treffer`} – zum Übernehmen
            antippen
          </Text>
          {results.map((result, index) => (
            <Pressable
              key={`${result.sourceId}-${index}`}
              style={styles.result}
              onPress={() => onResolved(result)}
              accessibilityRole="button"
              accessibilityLabel={`${result.name}, ${result.address} übernehmen`}
            >
              <Ionicons name="location-outline" size={17} color={colors.red} />
              <View style={styles.resultText}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {result.name}
                </Text>
                <Text style={styles.resultAddress} numberOfLines={2}>
                  {result.address}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
            </Pressable>
          ))}
        </View>
      )}

      {searched && !searching && results.length === 0 && !error && (
        <Text style={styles.hint}>Kein Treffer – versuch es mit weniger Angaben.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 0,
  },
  hint: {
    ...typography.caption,
    color: colors.inkSoft,
  },
  error: {
    ...typography.caption,
    color: colors.redDark,
  },
  results: {
    gap: spacing.xs,
  },
  resultsLabel: {
    ...typography.label,
    fontSize: 10,
    color: colors.inkFaint,
    marginBottom: spacing.xs,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  resultAddress: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 1,
  },
});
