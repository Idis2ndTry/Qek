import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { AppHeader } from '@/components/AppHeader';
import { RetroButton } from '@/components/RetroButton';
import { ScoreBadge, scoreColor } from '@/components/ScoreBadge';
import { Screen } from '@/components/Screen';
import { StarRating } from '@/components/StarRating';
import { Surface } from '@/components/Surface';
import { CATEGORIES, STAR_LABELS } from '@/constants/categories';
import { computeOverall, getPlace, setRating, updatePlace } from '@/db/repository';
import { colors, fonts, radius, spacing, type as typography } from '@/theme';
import { formatScore } from '@/utils/format';

/**
 * Der Bewertungs-Durchlauf: eine Kategorie pro Bildschirm, fünf große
 * Sterne, weiter. Nach der letzten Kategorie kommt die Zusammenfassung mit
 * Gesamtnote und dem eigenen Text.
 */
export default function RateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Number(id);
  const { width } = useWindowDimensions();

  const [placeName, setPlaceName] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  const slide = useRef(new Animated.Value(0)).current;
  const totalSteps = CATEGORIES.length + 1;
  const isSummary = step === CATEGORIES.length;

  useEffect(() => {
    let active = true;
    getPlace(placeId).then((place) => {
      if (!active || !place) return;
      setPlaceName(place.name);
      setRatings(place.ratings);
      setNotes(place.notes ?? '');
      // Beim erneuten Bewerten dort weitermachen, wo noch Lücken sind.
      const firstOpen = CATEGORIES.findIndex((c) => !(c.key in place.ratings));
      setStep(firstOpen === -1 ? CATEGORIES.length : firstOpen);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [placeId]);

  /** Blendet den nächsten Schritt seitlich ein. */
  const animateTo = useCallback(
    (next: number, direction: 1 | -1) => {
      slide.setValue(direction * width * 0.25);
      setStep(next);
      Animated.spring(slide, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }).start();
    },
    [slide, width],
  );

  const goNext = useCallback(() => {
    if (step < totalSteps - 1) animateTo(step + 1, 1);
  }, [animateTo, step, totalSteps]);

  const goBack = useCallback(() => {
    if (step > 0) animateTo(step - 1, -1);
    else router.back();
  }, [animateTo, step]);

  const rate = async (categoryKey: string, stars: number) => {
    setRatings((current) => ({ ...current, [categoryKey]: stars }));
    await setRating(placeId, categoryKey, stars);
    // Kurz stehen lassen, damit man den gesetzten Stern noch sieht.
    setTimeout(goNext, 260);
  };

  const skip = async (categoryKey: string) => {
    setRatings((current) => {
      const next = { ...current };
      delete next[categoryKey];
      return next;
    });
    await setRating(placeId, categoryKey, null);
    goNext();
  };

  const finish = async () => {
    await updatePlace(placeId, { notes: notes.trim() || null });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace(`/place/${placeId}`);
  };

  if (loading) return <Screen />;

  const overall = computeOverall(ratings);
  const answered = Object.keys(ratings).length;
  const progress = (step + 1) / totalSteps;

  return (
    <Screen>
      <AppHeader
        title={placeName || 'Bewertung'}
        subtitle={isSummary ? 'Zusammenfassung' : `Frage ${step + 1} von ${CATEGORIES.length}`}
        showBack
        right={
          !isSummary ? (
            <Pressable
              onPress={() => animateTo(CATEGORIES.length, 1)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Zur Zusammenfassung springen"
            >
              <Text style={styles.skipAll}>Fertig</Text>
            </Pressable>
          ) : undefined
        }
      />

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      {isSummary ? (
        <Summary
          overall={overall}
          answered={answered}
          ratings={ratings}
          notes={notes}
          onChangeNotes={setNotes}
          onJumpTo={(index) => animateTo(index, -1)}
          onFinish={finish}
        />
      ) : (
        <Animated.View style={[styles.stepWrap, { transform: [{ translateX: slide }] }]}>
          <CategoryStep
            index={step}
            value={ratings[CATEGORIES[step].key] ?? null}
            onRate={(stars) => rate(CATEGORIES[step].key, stars)}
            onSkip={() => skip(CATEGORIES[step].key)}
            onBack={goBack}
          />
        </Animated.View>
      )}
    </Screen>
  );
}

type StepProps = {
  index: number;
  value: number | null;
  onRate: (stars: number) => void;
  onSkip: () => void;
  onBack: () => void;
};

function CategoryStep({ index, value, onRate, onSkip, onBack }: StepProps) {
  const category = CATEGORIES[index];

  return (
    <View style={styles.step}>
      <View style={styles.stepTop}>
        <View style={styles.categoryIcon}>
          <Ionicons name={category.icon} size={34} color={colors.red} />
        </View>
        <Text style={styles.categoryLabel}>{category.label.toUpperCase()}</Text>
        <Text style={styles.question}>{category.question}</Text>
        <Text style={styles.hint}>{category.hint}</Text>
      </View>

      <View style={styles.starBlock}>
        <StarRating value={value} onChange={onRate} size={46} gap={10} />
        <Text style={[styles.starLabel, value ? styles.starLabelActive : null]}>
          {value ? STAR_LABELS[value] : 'Tippe einen Stern an'}
        </Text>
      </View>

      <View style={styles.stepActions}>
        <RetroButton label="Zurück" onPress={onBack} variant="ghost" icon="chevron-back" compact />
        <RetroButton
          label="Überspringen"
          onPress={onSkip}
          variant="secondary"
          iconRight="chevron-forward"
          compact
        />
      </View>
    </View>
  );
}

type SummaryProps = {
  overall: number | null;
  answered: number;
  ratings: Record<string, number>;
  notes: string;
  onChangeNotes: (value: string) => void;
  onJumpTo: (index: number) => void;
  onFinish: () => void;
};

function Summary({
  overall,
  answered,
  ratings,
  notes,
  onChangeNotes,
  onJumpTo,
  onFinish,
}: SummaryProps) {
  return (
    // Schiebt den Inhalt genau um die Tastaturhöhe hoch und scrollt das
    // angetippte Feld ins Bild - auch bei randloser Darstellung, wo
    // Android die Ansicht nicht mehr selbst verkleinert.
    <KeyboardAwareScrollView
      contentContainerStyle={styles.summary}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      bottomOffset={90}
    >
      <Surface style={styles.summaryCard} offset={5}>
        <Text style={styles.summaryLabel}>DEINE GESAMTNOTE</Text>
        <ScoreBadge score={overall} size="lg" />
        <Text style={styles.summaryText}>
          {overall === null
            ? 'Noch keine Kategorie bewertet.'
            : `${formatScore(overall)} von 5 – aus ${answered} ${answered === 1 ? 'Kategorie' : 'Kategorien'}`}
        </Text>
        {overall !== null && (
          <Text style={[styles.verdict, { color: scoreColor(overall) }]}>{verdict(overall)}</Text>
        )}
      </Surface>

      <Text style={styles.sectionTitle}>Einzelbewertungen</Text>
      <View style={styles.categoryList}>
        {CATEGORIES.map((category, index) => {
          const stars = ratings[category.key];
          return (
            <Pressable
              key={category.key}
              style={styles.categoryRow}
              onPress={() => onJumpTo(index)}
              accessibilityRole="button"
              accessibilityLabel={`${category.label}: ${stars ? `${stars} Sterne` : 'nicht bewertet'}. Zum Ändern antippen.`}
            >
              <Ionicons name={category.icon} size={17} color={colors.inkSoft} />
              <Text style={styles.categoryRowLabel} numberOfLines={1}>
                {category.label}
              </Text>
              {stars ? (
                <StarRating value={stars} readOnly size={15} gap={1} />
              ) : (
                <Text style={styles.notRated}>übersprungen</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Dein Tagebuch-Eintrag</Text>
      <Surface style={styles.notesCard} offset={3}>
        <TextInput
          value={notes}
          onChangeText={onChangeNotes}
          placeholder="Was ist dir in Erinnerung geblieben? Der Blick vom Stellplatz, das Wetter, die Nachbarn, was du beim nächsten Mal anders machen würdest …"
          placeholderTextColor={colors.inkFaint}
          multiline
          textAlignVertical="top"
          style={styles.notesInput}
          accessibilityLabel="Eigener Text zum Platz"
        />
      </Surface>

      <RetroButton
        label="Bewertung speichern"
        onPress={onFinish}
        icon="checkmark-circle"
        fullWidth
        style={styles.finishButton}
      />
      <Text style={styles.footnote}>
        Du kannst alles später jederzeit ändern – tippe im Platz einfach auf "Bewerten".
      </Text>
    </KeyboardAwareScrollView>
  );
}

function verdict(score: number): string {
  if (score >= 4.5) return 'Da fahren wir wieder hin!';
  if (score >= 4) return 'Richtig starker Platz';
  if (score >= 3.2) return 'Solide, geht klar';
  if (score >= 2.4) return 'Hat Luft nach oben';
  return 'Beim nächsten Mal lieber woanders';
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 5,
    backgroundColor: colors.line,
  },
  progressFill: {
    height: 5,
    backgroundColor: colors.red,
  },
  stepWrap: {
    flex: 1,
  },
  step: {
    flex: 1,
    padding: spacing.xl,
  },
  stepTop: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  categoryIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.redWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    ...typography.label,
    color: colors.red,
    textAlign: 'center',
  },
  question: {
    fontFamily: fonts.bodyBlack,
    fontSize: 23,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 30,
  },
  hint: {
    ...typography.body,
    color: colors.inkSoft,
    textAlign: 'center',
    maxWidth: 320,
  },
  starBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  starLabel: {
    ...typography.bodyStrong,
    color: colors.inkFaint,
  },
  starLabelActive: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  skipAll: {
    ...typography.label,
    color: colors.red,
  },
  flex: {
    flex: 1,
  },
  summary: {
    padding: spacing.lg,
    // Reichlich Luft, damit das Textfeld auch bei offener Tastatur weit
    // genug nach oben geschoben werden kann.
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.lg,
  },
  summaryCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  summaryLabel: {
    ...typography.label,
    color: colors.inkSoft,
  },
  summaryText: {
    ...typography.body,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  verdict: {
    fontFamily: fonts.display,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.inkSoft,
    marginBottom: -spacing.sm,
  },
  categoryList: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  categoryRowLabel: {
    ...typography.caption,
    flex: 1,
    color: colors.ink,
  },
  notRated: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.inkFaint,
  },
  notesCard: {
    padding: spacing.md,
  },
  notesInput: {
    ...typography.body,
    color: colors.ink,
    minHeight: 130,
  },
  finishButton: {
    marginTop: spacing.sm,
  },
  footnote: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: 'center',
  },
});
