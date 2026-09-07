import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { AwningStripes } from '@/components/AwningStripes';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { PlaceCard } from '@/components/PlaceCard';
import { Screen } from '@/components/Screen';
import { listPlaces, toggleFavorite, type PlaceSort } from '@/db/repository';
import type { PlaceSummary } from '@/db/types';
import { colors, fonts, radius, spacing, type as typography } from '@/theme';
import { formatScore } from '@/utils/format';

const SORT_OPTIONS: { key: PlaceSort; label: string }[] = [
  { key: 'recent', label: 'Zuletzt' },
  { key: 'rating', label: 'Beste Note' },
  { key: 'visited', label: 'Reisedatum' },
  { key: 'name', label: 'A–Z' },
];

/** Startbildschirm: alle besuchten Campingplätze als Tagebuch-Liste. */
export default function DiaryScreen() {
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<PlaceSort>('recent');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await listPlaces({ search, sort, favoritesOnly });
    setPlaces(result);
    setLoading(false);
  }, [search, sort, favoritesOnly]);

  // Beim Zurückkehren aus Detail oder Bewertung neu laden, damit
  // Änderungen sofort sichtbar sind.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleFavorite = async (id: number) => {
    await toggleFavorite(id);
    load();
  };

  const average =
    places.filter((p) => p.overall !== null).length > 0
      ? places.reduce((sum, p) => sum + (p.overall ?? 0), 0) /
        places.filter((p) => p.overall !== null).length
      : null;

  const isFiltered = search.trim().length > 0 || favoritesOnly;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandText}>
            <Text style={styles.brand}>REISE-TAGEBUCH</Text>
            <Text style={styles.tagline}>by @Qek_to_the_Future</Text>
          </View>
          <View style={styles.counter}>
            <Text style={styles.counterValue}>{places.length}</Text>
            <Text style={styles.counterLabel}>{places.length === 1 ? 'Platz' : 'Plätze'}</Text>
          </View>
        </View>
        <AwningStripes height={15} stripeWidth={20} scalloped />
      </View>

      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.inkSoft} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Platz, Ort oder Merkmal suchen"
            placeholderTextColor={colors.inkFaint}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Campingplätze durchsuchen"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Suche leeren">
              <Ionicons name="close-circle" size={17} color={colors.inkFaint} />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SORT_OPTIONS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterRow}
          ListHeaderComponent={
            <Chip
              label="Favoriten"
              icon={favoritesOnly ? 'heart' : 'heart-outline'}
              selected={favoritesOnly}
              onPress={() => setFavoritesOnly((v) => !v)}
            />
          }
          renderItem={({ item }) => (
            <Chip label={item.label} selected={sort === item.key} onPress={() => setSort(item.key)} />
          )}
        />
      </View>

      <FlatList
        data={places}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, places.length === 0 && styles.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.red} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          average !== null && places.length > 1 && !isFiltered ? (
            <View style={styles.averageBar}>
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text style={styles.averageText}>
                Dein Schnitt über alle Plätze: {formatScore(average)} von 5
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            onPress={() => router.push(`/place/${item.id}`)}
            onToggleFavorite={() => handleFavorite(item.id)}
          />
        )}
        ListEmptyComponent={
          loading ? null : isFiltered ? (
            <EmptyState
              icon="search-outline"
              title="Nichts gefunden"
              message="Zu dieser Suche gibt es noch keinen Eintrag. Probier einen anderen Begriff oder setz den Filter zurück."
              actionLabel="Filter zurücksetzen"
              onAction={() => {
                setSearch('');
                setFavoritesOnly(false);
              }}
            />
          ) : (
            <EmptyState
              icon="bonfire-outline"
              title="Noch kein Platz im Tagebuch"
              message="Trag deinen ersten Campingplatz ein, vergib Sterne für Sanitär, Preis und Lage – und halte fest, wo es dir gefallen hat."
              actionLabel="Ersten Platz eintragen"
              onAction={() => router.push('/place/new')}
            />
          )
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/place/new')}
        accessibilityRole="button"
        accessibilityLabel="Neuen Campingplatz eintragen"
      >
        <View style={styles.fabShadow} />
        <View style={styles.fabInner}>
          <Ionicons name="add" size={30} color={colors.white} />
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.paper,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  brandText: {
    flex: 1,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.red,
    letterSpacing: 0.3,
  },
  tagline: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  counter: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    backgroundColor: colors.redWash,
  },
  counterValue: {
    fontFamily: fonts.monoBold,
    fontSize: 19,
    color: colors.redDark,
    lineHeight: 22,
  },
  counterLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.redDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  controls: {
    paddingTop: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.cream,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    paddingVertical: 0,
  },
  filterRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 110,
    gap: 0,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  separator: {
    height: spacing.md,
  },
  averageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.md,
  },
  averageText: {
    ...typography.caption,
    color: colors.inkSoft,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 62,
    height: 62,
  },
  fabShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: colors.ink,
    borderRadius: 31,
  },
  fabInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
