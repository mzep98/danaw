import Text from '@/components/AppText';
import { colors, radius } from '@/constants/theme';
import { useLake } from '@/context/LakeContext';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  eyebrow?: string; // accepted so existing tabs compile; no longer rendered
  title: string;
  status?: string;
  live?: boolean;
  children?: React.ReactNode;
};

function PulseDot({ size = 8 }: { size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={{ width: size * 2.4, height: size * 2.4, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 2.4,
          height: size * 2.4,
          borderRadius: size * 1.2,
          backgroundColor: colors.green,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.green }} />
    </View>
  );
}

export default function Screen({ title, status, live = true, children }: Props) {
  const insets = useSafeAreaInsets();
  const { meshCount } = useLake();

  // Slide + fade in every time this tab becomes active
  const enter = useRef(new Animated.Value(0)).current;
  useFocusEffect(
    useCallback(() => {
      enter.setValue(0);
      Animated.timing(enter, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, [enter])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.brand}>
          <Image source={require('@/assets/images/danaw-logo.png')} style={s.logoImg} resizeMode="contain" />
          <Text variant="caption">Lake Buhi, Sector Alpha</Text>
        </View>
        <View style={s.mesh}>
          <PulseDot />
          <Text style={s.meshText}>{meshCount} nodes online</Text>
        </View>
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: enter,
          transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
        }}
      >
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <Text variant="display">{title}</Text>
          {status ? (
            <View style={s.statusRow}>
              {live ? <PulseDot size={6} /> : null}
              <Text variant="caption">{status}</Text>
            </View>
          ) : null}
          <View style={{ gap: 14, marginTop: 18 }}>{children}</View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { gap: 2 },
  logoImg: { width: 112, height: 28 },
  mesh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.greenBg,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  meshText: { color: colors.greenInk, fontWeight: '700', fontSize: 12.5 },
  body: { padding: 20, paddingBottom: 120 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginLeft: -4 },
});