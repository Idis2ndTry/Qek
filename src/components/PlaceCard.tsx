import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ScoreBadge } from './ScoreBadge';
import { Surface } from './Surface';
import { colors, fonts, radius, spacing, type as typography } from '@/theme';
import { formatDateRange } from '@/utils/format';
import type { PlaceSummary } from '@/db/types';

type Props = {
  place: PlaceSummary;
  onPress: () => void;
  onToggleFavorite: () => void;
};

/** Ein Campingplatz in der Tagebuch-Liste. */
export function PlaceCard({ place, onPress, onToggleFavorite }: Props) {
  const dateLabel = formatDateRange(place.visitedFrom, place.visitedTo);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}${place.overall ? `, Note ${place.overall.toFixed(1)}` : ', noch nicht bewertet'}`}
    >
      <Surface style={styles.card}>
        <View style={styles.row}>
          {place.coverPhoto ? (
            <Image
              source={{ uri: place.coverPhoto }}
              style={styles.cover}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={[styles.cover, styles.coverEmpty]}>
              <Ionicons name="image-outline" size={22} color={colors.inkFaint} />
            </View>
          )}

          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>
                {place.name}
              </Text>
              <Pressable
                onPress={onToggleFavorite}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={
                  place.favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'
                }
              >
                <Ionicons
                  name={place.favorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={place.favorite ? colors.red : colors.inkFaint}
                />
              </Pressable>
            </View>

            {place.address ? (
              <Text style={styles.address} numberOfLines={1}>
                {place.address}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              {dateLabel ? (
                <Meta icon="calendar-outline" text={dateLabel} />
              ) : (
                <Meta icon="time-outline" text="Kein Datum" />
              )}
              {place.photoCount > 0 && (
                <Meta icon="images-outline" text={String(place.photoCount)} />
              )}
              {place.ratedCount > 0 && (
                <Meta icon="checkmark-circle-outline" text={`${place.ratedCount} bewertet`} />
              )}
            </View>
          </View>

          <ScoreBadge score={place.overall} size="sm" />
        </View>

        {place.tags.length > 0 && (
          <View style={styles.tagRow}>
            {place.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {tag}
                </Text>
              </View>
            ))}
            {place.tags.length > 3 && (
              <Text style={styles.moreTags}>+{place.tags.length - 3}</Text>
            )}
          </View>
        )}
      </Surface>
    </Pressable>
  );
}

function Meta({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={12} color={colors.inkSoft} />
      <Text style={styles.metaText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cover: {
    width: 58,
    height: 58,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.cream,
  },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.h3,
    flex: 1,
    color: colors.ink,
  },
  address: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.inkSoft,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tag: {
    backgroundColor: colors.redWash,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 120,
  },
  tagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.redDark,
  },
  moreTags: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.inkFaint,
  },
});
