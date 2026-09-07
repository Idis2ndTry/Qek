import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { Chip } from '@/components/Chip';
import { MapPreview } from '@/components/MapPreview';
import { RetroButton } from '@/components/RetroButton';
import { ScoreBadge, scoreColor } from '@/components/ScoreBadge';
import { Screen } from '@/components/Screen';
import { StarRating } from '@/components/StarRating';
import { Surface } from '@/components/Surface';
import { CATEGORIES } from '@/constants/categories';
import { addPhoto, deletePhoto, deletePlace, getPlace, toggleFavorite } from '@/db/repository';
import type { PlaceWithDetails } from '@/db/types';
import { openGoogleSearch, openInGoogleMaps, openNavigation } from '@/services/links';
import { sharePlace } from '@/services/share';
import { pickFromLibrary, removePhotoFile, takePhoto } from '@/services/photos';
import { colors, fonts, radius, spacing, type as typography } from '@/theme';
import { formatDateRange, formatEuro, formatScore } from '@/utils/format';

/** Alles zu einem Campingplatz: Note, Karte, Google-Link, Fotos und Text. */
export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Number(id);

  const [place, setPlace] = useState<PlaceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const load = useCallback(async () => {
    const result = await getPlace(placeId);
    setPlace(result);
    setLoading(false);
  }, [placeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleAddPhotos = (mode: 'camera' | 'library') => async () => {
    setAddingPhoto(true);
    try {
      const result = mode === 'camera' ? await takePhoto() : await pickFromLibrary();
      if (result.permissionDenied) {
        Alert.alert(
          'Zugriff nicht erlaubt',
          mode === 'camera'
            ? 'Erlaube den Kamerazugriff in den Einstellungen, um Fotos aufzunehmen.'
            : 'Erlaube den Zugriff auf deine Fotos, um Bilder hinzuzufügen.',
        );
        return;
      }
      for (const uri of result.uris) {
        await addPhoto(placeId, uri);
      }
      if (result.uris.length > 0) await load();
    } catch {
      Alert.alert('Foto konnte nicht gespeichert werden', 'Versuch es bitte noch einmal.');
    } finally {
      setAddingPhoto(false);
    }
  };

  const confirmDeletePhoto = (photoId: number) => {
    Alert.alert('Foto löschen?', 'Das Bild wird aus dem Tagebuch entfernt.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          const uri = await deletePhoto(photoId);
          if (uri) removePhotoFile(uri);
          setLightbox(null);
          load();
        },
      },
    ]);
  };

  const confirmDeletePlace = () => {
    Alert.alert(
      'Platz löschen?',
      `"${place?.name}" wird mit allen Bewertungen und Fotos entfernt. Das lässt sich nicht rückgängig machen.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            for (const photo of place?.photos ?? []) removePhotoFile(photo.uri);
            await deletePlace(placeId);
            router.replace('/');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Lade …" showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.red} />
        </View>
      </Screen>
    );
  }

  if (!place) {
    return (
      <Screen>
        <AppHeader title="Nicht gefunden" showBack />
        <View style={styles.center}>
          <Text style={styles.missing}>Diesen Platz gibt es nicht mehr.</Text>
        </View>
      </Screen>
    );
  }

  const dateLabel = formatDateRange(place.visitedFrom, place.visitedTo);
  const totalCost =
    place.nights && place.pricePerNight ? place.nights * place.pricePerNight : null;
  const ratedCategories = CATEGORIES.filter((c) => place.ratings[c.key]);

  return (
    <Screen>
      <AppHeader
        title={place.name}
        subtitle={place.address ?? undefined}
        showBack
        right={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => sharePlace(place).catch(() => {})}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Eintrag teilen"
            >
              <Ionicons name="share-social-outline" size={22} color={colors.inkSoft} />
            </Pressable>
            <Pressable
              onPress={async () => {
                await toggleFavorite(placeId);
                load();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={place.favorite ? 'Favorit entfernen' : 'Als Favorit merken'}
            >
              <Ionicons
                name={place.favorite ? 'heart' : 'heart-outline'}
                size={22}
                color={place.favorite ? colors.red : colors.inkSoft}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push(`/place/edit/${placeId}`)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Platz bearbeiten"
            >
              <Ionicons name="create-outline" size={22} color={colors.inkSoft} />
            </Pressable>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.scoreCard} offset={5}>
          <ScoreBadge score={place.overall} size="lg" />
          <View style={styles.scoreText}>
            <Text style={styles.scoreTitle}>
              {place.overall === null ? 'Noch nicht bewertet' : 'Deine Gesamtnote'}
            </Text>
            <Text style={styles.scoreSub}>
              {place.overall === null
                ? 'Vergib Sterne für Sanitär, Preis, Lage und mehr.'
                : `${formatScore(place.overall)} von 5 · ${ratedCategories.length} von ${CATEGORIES.length} Kategorien`}
            </Text>
            {place.wouldReturn !== null && (
              <View style={styles.returnRow}>
                <Ionicons
                  name={place.wouldReturn ? 'checkmark-circle' : 'close-circle'}
                  size={15}
                  color={place.wouldReturn ? colors.mint : colors.redLight}
                />
                <Text style={styles.returnText}>
                  {place.wouldReturn ? 'Da fahren wir wieder hin' : 'Eher kein zweites Mal'}
                </Text>
              </View>
            )}
          </View>
        </Surface>

        <RetroButton
          label={place.overall === null ? 'Jetzt bewerten' : 'Bewertung anpassen'}
          onPress={() => router.push(`/rate/${placeId}`)}
          icon="star"
          fullWidth
        />

        {(dateLabel || place.nights || place.pricePerNight) && (
          <View style={styles.factRow}>
            {dateLabel ? <Fact icon="calendar-outline" label="Reise" value={dateLabel} /> : null}
            {place.nights ? (
              <Fact
                icon="moon-outline"
                label="Nächte"
                value={`${place.nights} ${place.nights === 1 ? 'Nacht' : 'Nächte'}`}
              />
            ) : null}
            {place.pricePerNight ? (
              <Fact
                icon="cash-outline"
                label="Preis"
                value={`${formatEuro(place.pricePerNight)} / Nacht`}
              />
            ) : null}
            {totalCost ? (
              <Fact icon="wallet-outline" label="Gesamt" value={formatEuro(totalCost)} />
            ) : null}
          </View>
        )}

        {place.tags.length > 0 && (
          <View style={styles.tagWrap}>
            {place.tags.map((tag) => (
              <Chip key={tag} label={tag} small />
            ))}
          </View>
        )}

        <Section title="Standort">
          <MapPreview
            lat={place.lat}
            lon={place.lon}
            label={place.name}
            height={190}
            interactive
          />
          <RetroButton
            label="Bei Google Maps ansehen"
            onPress={() => openInGoogleMaps(place)}
            variant="secondary"
            icon="logo-google"
            iconRight="open-outline"
            fullWidth
          />
          <View style={styles.linkRow}>
            <RetroButton
              label="Route"
              onPress={() => openNavigation(place)}
              variant="secondary"
              icon="navigate"
              compact
              style={styles.linkButton}
            />
            <RetroButton
              label="Im Web suchen"
              onPress={() => openGoogleSearch(place)}
              variant="secondary"
              icon="search"
              compact
              style={styles.linkButton}
            />
          </View>
          <Text style={styles.linkHint}>
            "Google Maps" öffnet den vollständigen Eintrag des Platzes – mit Fotos, Website,
            Öffnungszeiten und den Google-Bewertungen.
          </Text>
        </Section>

        {ratedCategories.length > 0 && (
          <Section title="Bewertung im Detail">
            <Surface offset={3} style={styles.ratingCard}>
              {ratedCategories.map((category, index) => (
                <View
                  key={category.key}
                  style={[styles.ratingRow, index === 0 && styles.ratingRowFirst]}
                >
                  <Ionicons name={category.icon} size={17} color={colors.inkSoft} />
                  <Text style={styles.ratingLabel} numberOfLines={1}>
                    {category.label}
                  </Text>
                  <StarRating value={place.ratings[category.key]} readOnly size={15} gap={1} />
                  <Text
                    style={[
                      styles.ratingValue,
                      { color: scoreColor(place.ratings[category.key]) },
                    ]}
                  >
                    {place.ratings[category.key]}
                  </Text>
                </View>
              ))}
            </Surface>
          </Section>
        )}

        <Section
          title={`Fotos${place.photos.length > 0 ? ` (${place.photos.length})` : ''}`}
          action={
            <View style={styles.photoActions}>
              <Pressable
                onPress={handleAddPhotos('camera')}
                hitSlop={8}
                disabled={addingPhoto}
                accessibilityRole="button"
                accessibilityLabel="Foto aufnehmen"
              >
                <Ionicons name="camera-outline" size={21} color={colors.red} />
              </Pressable>
              <Pressable
                onPress={handleAddPhotos('library')}
                hitSlop={8}
                disabled={addingPhoto}
                accessibilityRole="button"
                accessibilityLabel="Fotos aus der Galerie hinzufügen"
              >
                <Ionicons name="images-outline" size={21} color={colors.red} />
              </Pressable>
            </View>
          }
        >
          {addingPhoto && <ActivityIndicator color={colors.red} style={styles.photoSpinner} />}
          {place.photos.length === 0 ? (
            <Pressable style={styles.photoEmpty} onPress={handleAddPhotos('library')}>
              <Ionicons name="images-outline" size={26} color={colors.inkFaint} />
              <Text style={styles.photoEmptyText}>
                Noch keine Bilder – tippe hier, um Fotos vom Platz hinzuzufügen.
              </Text>
            </Pressable>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={place.photos}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.photoStrip}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => setLightbox(index)}
                  onLongPress={() => confirmDeletePhoto(item.id)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`Foto ${index + 1} von ${place.photos.length}`}
                >
                  <Image source={{ uri: item.uri }} style={styles.photo} contentFit="cover" />
                </Pressable>
              )}
            />
          )}
        </Section>

        {place.notes ? (
          <Section title="Dein Eintrag">
            <Surface offset={3} style={styles.notesCard}>
              <Text style={styles.notes}>{place.notes}</Text>
            </Surface>
          </Section>
        ) : null}

        <RetroButton
          label="Diesen Eintrag teilen"
          onPress={() => sharePlace(place).catch(() => {})}
          variant="secondary"
          icon="share-social"
          fullWidth
          style={styles.shareButton}
        />

        <RetroButton
          label="Platz löschen"
          onPress={confirmDeletePlace}
          variant="danger"
          icon="trash-outline"
          fullWidth
          style={styles.deleteButton}
        />
      </ScrollView>

      <Modal
        visible={lightbox !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox(null)}
      >
        <View style={styles.lightbox}>
          <Pressable style={styles.lightboxClose} onPress={() => setLightbox(null)} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
          {lightbox !== null && place.photos[lightbox] && (
            <>
              <Image
                source={{ uri: place.photos[lightbox].uri }}
                style={styles.lightboxImage}
                contentFit="contain"
              />
              <Pressable
                style={styles.lightboxDelete}
                onPress={() => confirmDeletePhoto(place.photos[lightbox].id)}
              >
                <Ionicons name="trash-outline" size={18} color={colors.white} />
                <Text style={styles.lightboxDeleteText}>Foto löschen</Text>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </Screen>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={15} color={colors.red} />
      <View>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: {
    ...typography.body,
    color: colors.inkSoft,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  scoreText: {
    flex: 1,
    gap: 2,
  },
  scoreTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  scoreSub: {
    ...typography.caption,
    color: colors.inkSoft,
  },
  returnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  returnText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
  },
  factRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.line,
    minWidth: '46%',
    flexGrow: 1,
  },
  factLabel: {
    ...typography.label,
    fontSize: 9,
    color: colors.inkFaint,
  },
  factValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.label,
    color: colors.inkSoft,
  },
  linkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  linkButton: {
    flex: 1,
  },
  linkHint: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkFaint,
  },
  ratingCard: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  ratingRowFirst: {
    borderTopWidth: 0,
  },
  ratingLabel: {
    ...typography.caption,
    flex: 1,
    color: colors.ink,
  },
  ratingValue: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    width: 16,
    textAlign: 'right',
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  photoSpinner: {
    alignSelf: 'flex-start',
  },
  photoStrip: {
    gap: spacing.sm,
  },
  photo: {
    width: 128,
    height: 128,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.line,
  },
  photoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  photoEmptyText: {
    ...typography.caption,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  notesCard: {
    padding: spacing.lg,
  },
  notes: {
    ...typography.body,
    color: colors.ink,
  },
  shareButton: {
    marginTop: spacing.md,
  },
  deleteButton: {
    marginTop: spacing.sm,
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(20,16,16,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
  lightboxClose: {
    position: 'absolute',
    top: 52,
    right: 22,
    zIndex: 2,
  },
  lightboxDelete: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  lightboxDeleteText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
});
