import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, radius, type as typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconRight?: React.ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

const VARIANTS: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.red, fg: colors.white, border: colors.ink },
  secondary: { bg: colors.paper, fg: colors.ink, border: colors.ink },
  ghost: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
  danger: { bg: colors.redWash, fg: colors.redDark, border: colors.redDark },
};

/**
 * Knopf im Retro-Look: dicke Kontur und harter Schatten, der beim Drücken
 * verschwindet - der Knopf wirkt dadurch, als würde er wirklich einsinken.
 */
export function RetroButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  compact = false,
}: Props) {
  const palette = VARIANTS[variant];
  const press = useRef(new Animated.Value(0)).current;
  const isInactive = disabled || loading;
  const hasShadow = variant !== 'ghost';
  const offset = 4;

  const translate = press.interpolate({ inputRange: [0, 1], outputRange: [0, offset] });

  return (
    <View style={[fullWidth && styles.fullWidth, style]}>
      {hasShadow && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: offset,
            left: offset,
            right: -offset,
            bottom: -offset,
            backgroundColor: isInactive ? colors.inkFaint : colors.ink,
            borderRadius: radius.md,
          }}
        />
      )}
      <Animated.View
        style={{ transform: [{ translateX: translate }, { translateY: translate }] }}
      >
        <Pressable
          onPress={() => {
            if (isInactive) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onPress();
          }}
          onPressIn={() =>
            !isInactive &&
            hasShadow &&
            Animated.timing(press, { toValue: 1, duration: 60, useNativeDriver: true }).start()
          }
          onPressOut={() =>
            Animated.timing(press, { toValue: 0, duration: 90, useNativeDriver: true }).start()
          }
          disabled={isInactive}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: isInactive, busy: loading }}
          style={[
            styles.button,
            compact && styles.compact,
            {
              backgroundColor: isInactive && variant === 'primary' ? colors.inkFaint : palette.bg,
              borderColor: palette.border,
              opacity: disabled ? 0.75 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={palette.fg} size="small" />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={compact ? 16 : 19} color={palette.fg} />}
              <Text style={[styles.label, compact && styles.labelCompact, { color: palette.fg }]}>
                {label}
              </Text>
              {iconRight && (
                <Ionicons name={iconRight} size={compact ? 16 : 19} color={palette.fg} />
              )}
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderRadius: radius.md,
    minHeight: 52,
  },
  compact: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    minHeight: 38,
  },
  label: {
    ...typography.h3,
    fontSize: 15,
  },
  labelCompact: {
    fontSize: 13,
  },
});
