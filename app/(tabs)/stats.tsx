import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScoreBadge, scoreColor } from '@/components/ScoreBadge';
import { Surface } from '@/components/Surface';
import { CATEGORY_BY_KEY } from '@/constants/categories';
import { getStats, type Stats } from '@/db/repository';
import { centeredContent, colors, fonts, radius, spacing, type as typography } from '@/theme';
import { formatEuro, formatScore } from '@/utils/format';

/** Zahlen zu deinen Reisen: Nächte, Ausgaben, Lieblingsplatz, Stärken. */
export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getStats().then((result) => {
        setStats(result);
        setLoading(false);
      });
    }, []),
  );

  if (loading) return <Screen />;

  if (!stats || stats.placeCount === 0) {
    return (
      <Screen>
        <AppHeader title="Statistik" display />
        <EmptyState
          icon="stats-chart-outline"
          title="Noch keine Zahlen"
          message="Sobald du Plätze eingetragen und bewertet hast, findest du hier deine Reisebilanz."
          actionLabel="Ersten Platz eintragen"
          onAction={() => router.push('/place/new')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Deine Reisebilanz" display />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tileGrid}>
          <Tile
            icon="bonfire-outline"
            value={String(stats.placeCount)}
            label={stats.placeCount === 1 ? 'Platz besucht' : 'Plätze besucht'}
          />
          <Tile icon="moon-outline" value={String(stats.totalNights)} label="Nächte gecampt" />
          <Tile
            icon="star-outline"
            value={formatScore(stats.averageOverall)}
            label="Schnitt von 5"
          />
          <Tile
            icon="wallet-outline"
            value={stats.totalSpent > 0 ? formatEuro(stats.totalSpent, 0) : '–'}
            label="Ausgegeben"
          />
          <Tile icon="heart-outline" value={String(stats.favoriteCount)} label="Favoriten" />
          <Tile icon="images-outline" value={String(stats.photoCount)} label="Fotos" />
        </View>

        {stats.bestPlace && (
          <Section title="Lieblingsplatz">
            <Pressable onPress={() => router.push(`/place/${stats.bestPlace!.id}`)}>
              <Surface style={styles.highlight} offset={4}>
                <ScoreBadge score={stats.bestPlace.overall} size="md" />
                <View style={styles.highlightText}>
                  <Text style={styles.highlightName} numberOfLines={1}>
                    {stats.bestPlace.name}
                  </Text>
                  <Text style={styles.highlightSub}>Deine beste Bewertung bisher</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={colors.inkFaint} />
              </Surface>
            </Pressable>
          </Section>
        )}

        {stats.categoryAverages.length > 0 && (
          <Section title="Wo deine Plätze punkten">
            <Surface offset={3} style={styles.barCard}>
              {[...stats.categoryAverages]
                .sort((a, b) => b.average - a.average)
                .map((entry, index) => {
                  const category = CATEGORY_BY_KEY[entry.key];
                  if (!category) return null;
                  return (
                    <View
                      key={entry.key}
                      style={[styles.barRow, index === 0 && styles.barRowFirst]}
                    >
                      <Ionicons name={category.icon} size={15} color={colors.inkSoft} />
                      <Text style={styles.barLabel} numberOfLines={1}>
                        {category.label}
                      </Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${(entry.average / 5) * 100}%`,
                              backgroundColor: scoreColor(entry.average),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barValue}>{formatScore(entry.average)}</Text>
                    </View>
                  );
                })}
            </Surface>
            <Text style={styles.footnote}>
              Durchschnitt aller bewerteten Plätze je Kategorie – so siehst du, worauf du beim
              nächsten Platz besonders achten solltest.
            </Text>
          </Section>
        )}

        {stats.worstPlace && stats.worstPlace.id !== stats.bestPlace?.id && (
          <Section title="Da lief es nicht so rund">
            <Pressable onPress={() => router.push(`/place/${stats.worstPlace!.id}`)}>
              <Surface style={styles.highlight} offset={3}>
                <ScoreBadge score={stats.worstPlace.overall} size="sm" />
                <View style={styles.highlightText}>
                  <Text style={styles.highlightName} numberOfLines={1}>
                    {stats.worstPlace.name}
                  </Text>
                  <Text style={styles.highlightSub}>Deine niedrigste Bewertung</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={colors.inkFaint} />
              </Surface>
            </Pressable>
          </Section>
        )}

        {stats.countries.length > 0 && (
          <Section title="Länder">
            <View style={styles.countryWrap}>
              {stats.countries.map((entry) => (
                <View key={entry.country} style={styles.country}>
                  <Text style={styles.countryName}>{entry.country}</Text>
                  <Text style={styles.countryCount}>{entry.count}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {stats.totalSpent > 0 && stats.totalNights > 0 && (
          <Text style={styles.footnote}>
            Das macht im Schnitt {formatEuro(stats.totalSpent / stats.totalNights)} pro Nacht.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function Tile({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
}) {
  return (
    <Surface style={styles.tile} offset={3}>
      <Ionicons name={icon} size={18} color={colors.red} />
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </Surface>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    ...centeredContent,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  tileValue: {
    fontFamily: fonts.monoBold,
    fontSize: 20,
    color: colors.ink,
  },
  tileLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.inkSoft,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  highlightText: {
    flex: 1,
  },
  highlightName: {
    ...typography.h3,
    color: colors.ink,
  },
  highlightSub: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
  },
  barCard: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  barRowFirst: {
    borderTopWidth: 0,
  },
  barLabel: {
    ...typography.caption,
    fontSize: 12,
    width: 132,
    color: colors.ink,
  },
  barTrack: {
    flex: 1,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  barFill: {
    height: 9,
    borderRadius: radius.pill,
  },
  barValue: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: colors.ink,
    width: 26,
    textAlign: 'right',
  },
  countryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  countryName: {
    ...typography.caption,
    fontSize: 12,
    color: colors.ink,
  },
  countryCount: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: colors.red,
  },
  footnote: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkFaint,
  },
});
