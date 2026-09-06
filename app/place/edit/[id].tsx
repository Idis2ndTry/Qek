import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { Chip } from '@/components/Chip';
import { RetroButton } from '@/components/RetroButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { SUGGESTED_TAGS } from '@/constants/categories';
import { getPlace, setTags, updatePlace } from '@/db/repository';
import { colors, fonts, radius, spacing, type as typography } from '@/theme';
import { formatDateShort, nightsBetween, parseGermanDate, todayIso } from '@/utils/format';

/** Reisedaten, Preis, Merkmale und der eigene Text zu einem Platz. */
export default function EditPlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Number(id);

  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getPlace(placeId).then((place) => {
      if (!active || !place) return;
      setName(place.name);
      setFrom(formatDateShort(place.visitedFrom));
      setTo(formatDateShort(place.visitedTo));
      setPrice(place.pricePerNight ? String(place.pricePerNight).replace('.', ',') : '');
      setNotes(place.notes ?? '');
      setSelectedTags(place.tags);
      setWouldReturn(place.wouldReturn);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [placeId]);

  const fromIso = from.trim() ? parseGermanDate(from) : null;
  const toIso = to.trim() ? parseGermanDate(to) : null;
  const fromInvalid = from.trim().length > 0 && fromIso === null;
  const toInvalid = to.trim().length > 0 && toIso === null;
  const nights = nightsBetween(fromIso, toIso);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  };

  const addCustomTag = () => {
    const clean = customTag.trim();
    if (!clean) return;
    if (!tags.includes(clean)) setSelectedTags((current) => [...current, clean]);
    setCustomTag('');
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name fehlt', 'Der Platz braucht einen Namen.');
      return;
    }
    if (fromInvalid || toInvalid) {
      Alert.alert('Datum prüfen', 'Bitte im Format TT.MM.JJJJ eingeben, z. B. 04.07.2026.');
      return;
    }
    if (fromIso && toIso && toIso < fromIso) {
      Alert.alert('Datum prüfen', 'Die Abreise liegt vor der Anreise.');
      return;
    }

    const parsedPrice = price.trim() ? Number(price.replace(',', '.')) : null;
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      Alert.alert('Preis prüfen', 'Gib den Preis als Zahl ein, z. B. 24,50.');
      return;
    }

    setSaving(true);
    try {
      await updatePlace(placeId, {
        name: name.trim(),
        visitedFrom: fromIso,
        visitedTo: toIso,
        nights,
        pricePerNight: parsedPrice,
        notes: notes.trim() || null,
        wouldReturn,
      });
      await setTags(placeId, tags);
      router.back();
    } catch {
      Alert.alert('Speichern fehlgeschlagen', 'Bitte versuch es noch einmal.');
      setSaving(false);
    }
  };

  if (loading) return <Screen />;

  const allTags = [...SUGGESTED_TAGS, ...tags.filter((t) => !SUGGESTED_TAGS.includes(t))];

  return (
    <Screen>
      <AppHeader title="Platz bearbeiten" showBack />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label="NAME DES PLATZES">
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="Campingplatz"
              placeholderTextColor={colors.inkFaint}
              accessibilityLabel="Name des Platzes"
            />
          </Field>

          <View style={styles.row}>
            <Field label="ANREISE" style={styles.half} error={fromInvalid}>
              <TextInput
                value={from}
                onChangeText={setFrom}
                style={styles.input}
                placeholder="TT.MM.JJJJ"
                placeholderTextColor={colors.inkFaint}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Anreisedatum"
              />
            </Field>
            <Field label="ABREISE" style={styles.half} error={toInvalid}>
              <TextInput
                value={to}
                onChangeText={setTo}
                style={styles.input}
                placeholder="TT.MM.JJJJ"
                placeholderTextColor={colors.inkFaint}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Abreisedatum"
              />
            </Field>
          </View>

          <View style={styles.quickRow}>
            <Pressable
              onPress={() => setFrom(formatDateShort(todayIso()))}
              style={styles.quickButton}
              accessibilityRole="button"
            >
              <Ionicons name="today-outline" size={13} color={colors.red} />
              <Text style={styles.quickText}>Anreise = heute</Text>
            </Pressable>
            {nights !== null && (
              <View style={styles.nightsBadge}>
                <Text style={styles.nightsText}>
                  {nights} {nights === 1 ? 'Nacht' : 'Nächte'}
                </Text>
              </View>
            )}
          </View>

          <Field label="PREIS PRO NACHT (EURO)">
            <TextInput
              value={price}
              onChangeText={setPrice}
              style={styles.input}
              placeholder="z. B. 24,50"
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              accessibilityLabel="Preis pro Nacht in Euro"
            />
          </Field>

          <View style={styles.block}>
            <Text style={styles.label}>WUERDEST DU WIEDER HINFAHREN?</Text>
            <View style={styles.returnRow}>
              <ReturnOption
                label="Auf jeden Fall"
                icon="thumbs-up-outline"
                active={wouldReturn === true}
                onPress={() => setWouldReturn(wouldReturn === true ? null : true)}
              />
              <ReturnOption
                label="Eher nicht"
                icon="thumbs-down-outline"
                active={wouldReturn === false}
                onPress={() => setWouldReturn(wouldReturn === false ? null : false)}
              />
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>MERKMALE</Text>
            <View style={styles.tagWrap}>
              {allTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={tags.includes(tag)}
                  onPress={() => toggleTag(tag)}
                />
              ))}
            </View>
            <View style={styles.customTagRow}>
              <TextInput
                value={customTag}
                onChangeText={setCustomTag}
                onSubmitEditing={addCustomTag}
                style={[styles.input, styles.customTagInput]}
                placeholder="Eigenes Merkmal hinzufügen"
                placeholderTextColor={colors.inkFaint}
                returnKeyType="done"
                accessibilityLabel="Eigenes Merkmal"
              />
              <RetroButton
                label="Hinzu"
                onPress={addCustomTag}
                variant="secondary"
                compact
                disabled={!customTag.trim()}
              />
            </View>
          </View>

          <Field label="DEIN TAGEBUCH-EINTRAG">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, styles.notesInput]}
              placeholder="Wie war es? Was war besonders?"
              placeholderTextColor={colors.inkFaint}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Eigener Text"
            />
          </Field>

          <RetroButton
            label="Änderungen speichern"
            onPress={save}
            icon="checkmark"
            fullWidth
            loading={saving}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  children,
  style,
  error = false,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
  error?: boolean;
}) {
  return (
    <View style={[styles.block, style]}>
      <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      <Surface offset={3} borderColor={error ? colors.red : colors.ink} style={styles.inputCard}>
        {children}
      </Surface>
    </View>
  );
}

function ReturnOption({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.returnOption, active && styles.returnOptionActive]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <Ionicons name={icon} size={18} color={active ? colors.white : colors.inkSoft} />
      <Text style={[styles.returnLabel, active && styles.returnLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  block: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  label: {
    ...typography.label,
    color: colors.inkSoft,
  },
  labelError: {
    color: colors.red,
  },
  inputCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  input: {
    ...typography.body,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 0,
  },
  notesInput: {
    minHeight: 120,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: -spacing.sm,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quickText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.red,
  },
  nightsBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.redWash,
  },
  nightsText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: colors.redDark,
  },
  returnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  returnOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  returnOptionActive: {
    backgroundColor: colors.red,
    borderColor: colors.ink,
  },
  returnLabel: {
    ...typography.caption,
    color: colors.inkSoft,
  },
  returnLabelActive: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
