import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme';

type Props = {
  value: number | null;
  onChange?: (stars: number) => void;
  size?: number;
  gap?: number;
  /** Nur Anzeige - keine Berührung möglich. */
  readOnly?: boolean;
  color?: string;
};

/**
 * Sternebewertung von 1 bis 5.
 *
 * Beim Antippen springt der Stern kurz auf und es gibt eine leichte
 * Vibration - das macht das schnelle Durchklicken spürbar.
 */
export function StarRating({
  value,
  onChange,
  size = 34,
  gap = 6,
  readOnly = false,
  color = colors.gold,
}: Props) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={[styles.row, { gap }]}>
      {stars.map((star) => (
        <Star
          key={star}
          index={star}
          filled={(value ?? 0) >= star}
          size={size}
          color={color}
          readOnly={readOnly}
          onPress={() => {
            if (readOnly || !onChange) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onChange(star);
          }}
        />
      ))}
    </View>
  );
}

type StarProps = {
  index: number;
  filled: boolean;
  size: number;
  color: string;
  readOnly: boolean;
  onPress: () => void;
};

function Star({ index, filled, size, color, readOnly, onPress }: StarProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasFilled = useRef(filled);

  useEffect(() => {
    if (filled && !wasFilled.current) {
      // Kleine Verzögerung pro Stern: die Sterne "fallen" von links nach
      // rechts ein, statt alle gleichzeitig zu zucken.
      Animated.sequence([
        Animated.delay(index * 45),
        Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 40 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
    }
    wasFilled.current = filled;
  }, [filled, index, scale]);

  return (
    <Pressable
      onPress={onPress}
      disabled={readOnly}
      hitSlop={6}
      accessibilityRole={readOnly ? 'image' : 'button'}
      accessibilityLabel={`${index} von 5 Sternen`}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={size}
          color={filled ? color : colors.inkFaint}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
