import { colors, radius, shadow } from '@/constants/theme';
import { useRef } from 'react';
import { Animated, Pressable, StyleProp, View, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Layout style for the wrapper (e.g. { flex: 1 } inside a row). */
  outerStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'light' | 'dark' | 'tint';
  accent?: string;
};

export default function Card({ children, style, outerStyle, onPress, tone = 'light', accent }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const base: ViewStyle = {
    backgroundColor: tone === 'dark' ? colors.navy : tone === 'tint' ? colors.oceanBg : colors.card,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: tone === 'dark' ? 'rgba(255,255,255,0.08)' : accent ?? colors.border,
    overflow: 'hidden',
    ...shadow(accent ?? colors.navy, 1),
  };

  if (!onPress) return <View style={[base, outerStyle, style]}>{children}</View>;

  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      style={outerStyle}
    >
      <Animated.View style={[base, { flexGrow: 1 }, style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}