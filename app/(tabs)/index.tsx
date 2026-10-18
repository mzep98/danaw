import Text from '@/components/AppText';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import { colors, gradients, radius } from '@/constants/theme';
import { LAYERS, useLake, type LayerKey } from '@/context/LakeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Switch, View } from 'react-native';
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

type IconName = keyof typeof Ionicons.glyphMap;
const go = (path: string) => router.push(path as any);

/* ---------- water column geometry: three equal layers ---------- */
const BAND_H = 77;
const COL_H = BAND_H * 3;
const COL_W = 136;
const CENTERS = [BAND_H * 0.5, BAND_H * 1.5, BAND_H * 2.5];
const idxOf = (k: LayerKey) => LAYERS.findIndex((l) => l.key === k);

const LAYER_COLOR: Record<LayerKey, string> = {
  surface: colors.sky,
  mid: colors.violet,
  bottom: colors.amber,
};
const LAYER_NAME: Record<LayerKey, string> = {
  surface: 'Surface',
  mid: 'Mid-Water',
  bottom: 'Bottom',
};

const BUBBLES = [
  { left: 18, size: 6, duration: 4200, delay: 0 },
  { left: 72, size: 4, duration: 5200, delay: 900 },
  { left: 104, size: 7, duration: 4600, delay: 1800 },
  { left: 40, size: 5, duration: 5600, delay: 2600 },
  { left: 60, size: 4, duration: 3800, delay: 400 },
  { left: 10, size: 6, duration: 4400, delay: 1400 },
  { left: 90, size: 4, duration: 3600, delay: 2200 },
  { left: 30, size: 5, duration: 5000, delay: 3000 },
  { left: 52, size: 6, duration: 4000, delay: 3400 },
];

/* ---------- status helpers ---------- */
function riskInfo(r: number) {
  if (r < 20) return { label: 'Low', bg: colors.greenBg, fg: colors.greenInk, level: 1, color: colors.green };
  if (r < 40) return { label: 'Watch', bg: colors.amberBg, fg: colors.amberInk, level: 2, color: colors.amber };
  return { label: 'High', bg: colors.coralBg, fg: '#B3342E', level: 3, color: colors.coral };
}

function doInfo(v: number) {
  if (v >= 5) return { label: 'Normal', bg: colors.greenBg, fg: colors.greenInk };
  if (v >= 4) return { label: 'Low', bg: colors.amberBg, fg: colors.amberInk };
  return { label: 'Critical', bg: colors.coralBg, fg: '#B3342E' };
}

/* ---------- small building blocks ---------- */
function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={s.badge}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bg, borderRadius: radius.pill }]} />
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: fg }}>{label}</Text>
    </View>
  );
}

function IconBox({ name, bg, color }: { name: IconName; bg: string; color: string }) {
  return (
    <View style={[s.iconBox, { backgroundColor: bg }]}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}

function Sparkline() {
  return (
    <Svg width="100%" height={44} viewBox="0 0 140 44" preserveAspectRatio="none">
      <Defs>
        <SvgGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.ocean} stopOpacity="0.3" />
          <Stop offset="1" stopColor={colors.ocean} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Path d="M0 30 C18 14, 34 14, 56 26 S92 38, 110 22 S130 12, 140 18 L140 44 L0 44 Z" fill="url(#fill)" />
      <Path
        d="M0 30 C18 14, 34 14, 56 26 S92 38, 110 22 S130 12, 140 18"
        stroke={colors.ocean}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** Looping animation helper */
function useLoop(duration: number, active = true, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      v.stopAnimation();
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, duration, delay, v]);
  return v;
}

function Bubble({ left, size, duration, delay }: { left: number; size: number; duration: number; delay: number }) {
  const v = useLoop(duration, true, delay);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [COL_H, -10] });
  const opacity = v.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.75, 0.75, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.8)',
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

function Ring({ active, color, size }: { active: boolean; color: string; size: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      v.stopAnimation();
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
      }}
    />
  );
}

/** Rolling surface waves at the top of the water column */
function Waves() {
  const v = useLoop(3200);
  const d = useMemo(() => {
    let p = 'M0 0';
    for (let i = 0; i <= 300; i += 4) p += ` L${i} ${(7 + 3 * Math.sin((i / 60) * Math.PI * 2)).toFixed(1)}`;
    return p + ' L300 0 Z';
  }, []);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: 300, transform: [{ translateX }] }}>
      <Svg width={300} height={14}>
        <Path d={d} fill="rgba(255,255,255,0.45)" />
      </Svg>
    </Animated.View>
  );
}

/* ---------- Water column: drag the probe or tap a layer ---------- */
function WaterColumn({
  layer,
  onSelect,
  modeAnim,
  bubbleCount,
}: {
  layer: LayerKey;
  onSelect: (k: LayerKey) => void;
  modeAnim: Animated.Value;
  bubbleCount: number;
}) {
  const probeY = useRef(new Animated.Value(CENTERS[idxOf(layer)])).current;
  const dragging = useRef(false);
  const current = useRef(idxOf(layer));
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const snap = () =>
    Animated.spring(probeY, { toValue: CENTERS[current.current], useNativeDriver: true, bounciness: 9, speed: 14 }).start();

  useEffect(() => {
    current.current = idxOf(layer);
    if (!dragging.current) snap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer]);

  const handle = (y: number) => {
    probeY.setValue(Math.min(COL_H - 12, Math.max(12, y)));
    const i = Math.min(2, Math.max(0, Math.floor(y / BAND_H)));
    if (i !== current.current) {
      current.current = i;
      onSelectRef.current(LAYERS[i].key);
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        dragging.current = true;
        probeY.stopAnimation();
        handle(e.nativeEvent.locationY);
      },
      onPanResponderMove: (e) => handle(e.nativeEvent.locationY),
      onPanResponderRelease: () => {
        dragging.current = false;
        snap();
      },
      onPanResponderTerminate: () => {
        dragging.current = false;
        snap();
      },
    })
  ).current;

  const idx = idxOf(layer);

  return (
    <View style={s.column}>
      {/* temperature palette */}
      <LinearGradient colors={['#FF9F5A', '#3CC8F0', '#0E3A66']} style={StyleSheet.absoluteFill} />
      {/* oxygen palette, cross-faded in */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: modeAnim }]} pointerEvents="none">
        <LinearGradient colors={['#34D8B0', '#1E88E5', '#5A2D8B']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {BUBBLES.slice(0, bubbleCount).map((b, i) => (
        <Bubble key={i} {...b} />
      ))}

      {/* active layer highlight */}
      <View
        pointerEvents="none"
        style={[s.band, { top: idx * BAND_H, height: BAND_H, borderColor: 'rgba(255,255,255,0.75)' }]}
      />
      {/* layer separators */}
      {[1, 2].map((i) => (
        <View key={i} pointerEvents="none" style={[s.sep, { top: i * BAND_H }]} />
      ))}

      {/* thermocline, sits where mid-water meets the deep layer */}
      <View pointerEvents="none" style={[s.thermoLine, { top: BAND_H * 2 }]} />
      <View pointerEvents="none" style={[s.thermoTag, { top: BAND_H * 2 - 18 }]}>
        <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '700' }}>Thermocline</Text>
      </View>

      {/* node buoys */}
      {LAYERS.map((l, i) => (
        <View key={l.key} pointerEvents="none" style={[s.nodeWrap, { top: CENTERS[i] - 8 }]}>
          <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
            <Ring active={l.key === layer} color="#fff" size={16} />
            <View style={[s.nodeDot, { borderColor: LAYER_COLOR[l.key] }]} />
          </View>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>N{i + 1}</Text>
        </View>
      ))}

      <Waves />

      {/* draggable probe */}
      <Animated.View pointerEvents="none" style={[s.probe, { transform: [{ translateY: probeY }] }]}>
        <View style={s.probeLine} />
        <View style={s.probeTag}>
          <Ionicons name="swap-vertical" size={12} color={colors.navy} />
          <Text style={{ color: colors.navy, fontSize: 11.5, fontWeight: '700' }}>
            {LAYERS[idx].depth.toFixed(1)} m
          </Text>
        </View>
      </Animated.View>

      {/* touch surface */}
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
    </View>
  );
}

/* ---------- Remote actuation ---------- */
function MiniBubble({ left, delay }: { left: number; delay: number }) {
  const v = useLoop(1900, true, delay);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#fff',
        opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.9, 0] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [40, 6] }) }],
      }}
    />
  );
}

/** O2 pump tile: water level rises, surface sloshes, bubbles stream up */
function PumpTile({ on }: { on: boolean }) {
  const fill = useRef(new Animated.Value(0)).current;
  const slosh = useLoop(1800, on);
  useEffect(() => {
    Animated.timing(fill, {
      toValue: on ? 1 : 0,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [on, fill]);

  const waveD = useMemo(() => {
    let p = 'M0 8';
    for (let i = 0; i <= 88; i += 2) p += ` L${i} ${(4 + 2.4 * Math.sin((i / 22) * Math.PI * 2)).toFixed(1)}`;
    return p + ' L88 8 Z';
  }, []);

  const levelY = fill.interpolate({ inputRange: [0, 1], outputRange: [46, 11] });
  const waveX = slosh.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });

  return (
    <View style={s.pumpTile}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 44, transform: [{ translateY: levelY }] }}>
        <Animated.View style={{ width: 88, transform: [{ translateX: waveX }] }}>
          <Svg width={88} height={8}>
            <Path d={waveD} fill="rgba(22,119,229,0.85)" />
          </Svg>
        </Animated.View>
        <View style={{ height: 44, backgroundColor: 'rgba(22,119,229,0.85)' }} />
      </Animated.View>
      {on && (
        <>
          <MiniBubble left={12} delay={0} />
          <MiniBubble left={24} delay={600} />
          <MiniBubble left={33} delay={1200} />
        </>
      )}
      <Ionicons name={on ? 'water' : 'water-outline'} size={21} color={on ? '#fff' : colors.ocean} />
    </View>
  );
}

function FanTile({ on }: { on: boolean }) {
  const v = useLoop(1100, on);
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={[s.pumpTile, on && { backgroundColor: '#CFE5FF' }]}>
      <Ring active={on} color={colors.ocean} size={44} />
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="aperture" size={24} color={colors.ocean} />
      </Animated.View>
    </View>
  );
}

function ActuatorRow({
  name,
  channel,
  on,
  kind,
  note,
  onToggle,
}: {
  name: string;
  channel: string;
  on: boolean;
  kind: 'fan' | 'pump';
  note?: string;
  onToggle: () => void;
}) {
  return (
    <View style={[s.actRow, on && s.actRowOn]}>
      {kind === 'fan' ? <FanTile on={on} /> : <PumpTile on={on} />}
      <View style={{ flex: 1 }}>
        <Text variant="heading" style={{ fontSize: 15.5 }}>{name}</Text>
        <Text variant="caption" style={on ? { color: colors.greenInk, fontWeight: '600' } : undefined}>
          {on ? `Running${note ? `, ${note}` : ''}` : `Standby, ${channel}`}
        </Text>
      </View>
      <Switch
        value={on}
        onValueChange={onToggle}
        trackColor={{ true: colors.ocean, false: '#D9E0EA' }}
        ios_backgroundColor="#D9E0EA"
      />
    </View>
  );
}

/* ---------- screen ---------- */
export default function Dash() {
  const { readings, syncAge, aerators, toggleActuator, aerationActive, layers, layer, setLayer } = useLake();
  const [mode, setMode] = useState<'temp' | 'do'>('temp');
  const modeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(modeAnim, { toValue: mode === 'do' ? 1 : 0, duration: 450, useNativeDriver: true }).start();
  }, [mode, modeAnim]);

  const risk = riskInfo(readings.risk);
  const doState = doInfo(readings.doLevel);
  const delta = readings.doLevel - 5.9;
  const d = layers[layer];
  const gap = layers.surface.temp - d.temp;

  const insight = (() => {
    if (mode === 'temp') {
      if (layer === 'surface') return { icon: 'sunny' as IconName, color: colors.amber, text: 'Warmest layer. This is where your cages and fish feed.' };
      if (layer === 'mid')
        return { icon: 'trending-down' as IconName, color: colors.sky, text: `${gap.toFixed(1)}°C cooler than the surface. The thermocline sits just below.` };
      return { icon: 'snow' as IconName, color: colors.sky, text: `${gap.toFixed(1)}°C cooler than the surface. A narrowing gap signals overturn risk.` };
    }
    if (d.doLevel < 4.5)
      return { icon: 'alert-circle' as IconName, color: colors.coral, text: 'Low oxygen here. If the lake turns over, this water rises toward the cages.' };
    return { icon: 'checkmark-circle' as IconName, color: colors.green, text: 'Oxygen is healthy at this depth.' };
  })();

  return (
    <Screen title="Lake Overview" status={`Synced ${syncAge}s ago`}>
      {/* Row 1 */}
      <View style={s.row}>
        <Card
          onPress={() => {
            setLayer('bottom');
            go(`/map?view=bathy&node=02&t=${Date.now()}`);
          }}
          outerStyle={s.half}
        >
          <View style={s.cardTop}>
            <IconBox name="water-outline" bg={colors.greenBg} color={colors.green} />
            <Badge label={doState.label} bg={doState.bg} fg={doState.fg} />
          </View>
          <Text variant="label" style={s.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            Dissolved Oxygen
          </Text>
          <Text variant="metric">
            {readings.doLevel.toFixed(1)}
            <Text style={s.unit}> mg/L</Text>
          </Text>
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.min(100, readings.doLevel * 10)}%`, backgroundColor: colors.green }]} />
          </View>
          <Text variant="caption" style={{ marginTop: 8, color: delta >= 0 ? colors.greenInk : colors.coral, fontWeight: '600' }}>
            {delta >= 0 ? '+' : '−'}
            {Math.abs(delta).toFixed(1)} since 09:00
          </Text>
        </Card>

        <Card onPress={() => go(`/map?view=thermal&t=${Date.now()}`)} outerStyle={s.half}>
          <View style={s.cardTop}>
            <IconBox name="thermometer-outline" bg={colors.oceanBg} color={colors.ocean} />
            <Badge label="+0.4°" bg={colors.oceanBg} fg={colors.ocean} />
          </View>
          <Text variant="label" style={s.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            Water Temperature
          </Text>
          <Text variant="metric">
            {readings.temp.toFixed(1)}
            <Text style={s.unit}> °C</Text>
          </Text>
          <Sparkline />
          <Text variant="caption">Last 24 hours</Text>
        </Card>
      </View>

      {/* Row 2 */}
      <View style={s.row}>
        <Card onPress={() => go('/forecast')} outerStyle={s.half}>
          <View style={s.cardTop}>
            <IconBox name="warning-outline" bg={risk.bg} color={risk.color} />
            <Badge label={risk.label} bg={risk.bg} fg={risk.fg} />
          </View>
          <Text variant="label" style={s.label}>Risk Level</Text>
          <Text variant="metric">
            {readings.risk}
            <Text style={s.unit}> %</Text>
          </Text>
          <View style={s.segments}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[s.segment, { backgroundColor: i <= risk.level ? risk.color : '#E6EBF2' }]} />
            ))}
          </View>
          <View style={s.segLabels}>
            {['Low', 'Watch', 'High'].map((l, i) => (
              <Text key={l} variant="caption" style={[{ fontSize: 11 }, i + 1 === risk.level && { color: colors.text, fontWeight: '700' }]}>
                {l}
              </Text>
            ))}
          </View>
        </Card>

        <Card onPress={() => go(`/map?view=bathy&t=${Date.now()}`)} outerStyle={s.half}>
          <View style={s.cardTop}>
            <IconBox name="layers-outline" bg={colors.violetBg} color={colors.violet} />
            <Ionicons name="arrow-forward-circle" size={22} color={colors.border} />
          </View>
          <Text variant="label" style={s.label}>Max Depth</Text>
          <Text variant="metric">
            8.2<Text style={s.unit}> m</Text>
          </Text>
          <View style={s.gauge}>
            <LinearGradient
              colors={['#BFE3F7', colors.ocean, colors.navy]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.gaugeFill, { width: '82%' }]}
            />
          </View>
          <View style={s.gaugeLabels}>
            <Text variant="caption" style={{ fontSize: 11 }}>0 m</Text>
            <Text variant="caption" style={{ fontSize: 11 }}>10 m</Text>
          </View>
        </Card>
      </View>

      {/* Water column profile */}
      <LinearGradient colors={gradients.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.profile}>
        <View style={s.profileTop}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text variant="title" style={{ color: '#fff' }}>Water Column Profile</Text>
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
              Drag the probe or tap a layer
            </Text>
          </View>
          <View style={s.toggle}>
            {(['temp', 'do'] as const).map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} style={[s.toggleBtn, mode === m && s.toggleActive]}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: mode === m ? colors.navy : 'rgba(255,255,255,0.75)' }}>
                  {m === 'temp' ? 'Temp' : 'Oxygen'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.profileBody}>
          <WaterColumn layer={layer} onSelect={setLayer} modeAnim={modeAnim} bubbleCount={aerationActive ? 9 : 3} />

          <View style={s.layerList}>
            {LAYERS.map((l) => {
              const r = layers[l.key];
              const active = l.key === layer;
              const low = r.doLevel < 4.5;
              return (
                <Pressable
                  key={l.key}
                  onPress={() => setLayer(l.key)}
                  style={[s.layerRow, active && { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: LAYER_COLOR[l.key] }]}
                >
                  <View style={[s.swatch, { backgroundColor: LAYER_COLOR[l.key] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{LAYER_NAME[l.key]}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5, fontWeight: '500' }}>
                      {l.depth.toFixed(1)} m
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                      {mode === 'temp' ? `${r.temp.toFixed(1)}°C` : r.doLevel.toFixed(1)}
                    </Text>
                    {mode === 'do' && <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10.5 }}>mg/L</Text>}
                    {mode === 'do' && low && (
                      <View style={s.lowTag}>
                        <Text style={{ color: '#FFD08A', fontSize: 10, fontWeight: '700' }}>Low</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.insight}>
          <Ionicons name={insight.icon} size={20} color={insight.color} />
          <Text style={{ flex: 1, color: '#fff', fontSize: 13, lineHeight: 19, fontWeight: '500' }}>{insight.text}</Text>
        </View>

        <Pressable onPress={() => go(`/map?view=bathy&t=${Date.now()}`)}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.mapBtn}>
            <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '700' }}>
              Explore {LAYER_NAME[layer]} on Map
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </LinearGradient>
        </Pressable>
      </LinearGradient>

      {/* Remote actuation */}
      <Card>
        <View style={s.actTop}>
          <View>
            <Text variant="title">Remote Actuation</Text>
            <Text variant="caption">LoRa Control Hub</Text>
          </View>
          <Badge label="32 ms" bg={colors.oceanBg} fg={colors.ocean} />
        </View>
        <ActuatorRow
          name="Aerator Array 1"
          channel="Channel 04"
          kind="fan"
          on={aerators.a1}
          onToggle={() => toggleActuator('a1')}
        />
        <ActuatorRow
          name="O₂ Pump Station"
          channel="Channel 07"
          kind="pump"
          on={aerators.pump}
          note="+0.6 mg/L"
          onToggle={() => toggleActuator('pump')}
        />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14 },
  half: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  label: { marginTop: 14, color: colors.muted },
  unit: { fontSize: 14, fontWeight: '500', color: colors.muted, letterSpacing: 0 },
  track: { height: 7, borderRadius: 4, backgroundColor: '#E6EBF2', marginTop: 10, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  segments: { flexDirection: 'row', gap: 6, marginTop: 14 },
  segment: { flex: 1, height: 7, borderRadius: 4 },
  segLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  gauge: { height: 7, borderRadius: 4, backgroundColor: '#E6EBF2', overflow: 'hidden', marginTop: 14 },
  gaugeFill: { height: 7, borderRadius: 4 },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },

  profile: { borderRadius: 26, padding: 18 },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  toggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 13, padding: 3 },
  toggleBtn: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 10 },
  toggleActive: { backgroundColor: '#fff' },
  profileBody: { flexDirection: 'row', gap: 12, marginTop: 16 },
  column: { width: COL_W, height: COL_H, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.navy },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  sep: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  thermoLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.85)',
  },
  thermoTag: { position: 'absolute', right: 8 },
  nodeWrap: { position: 'absolute', left: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nodeDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 3 },
  probe: { position: 'absolute', left: 0, right: 0, top: -12, height: 24, justifyContent: 'center' },
  probeLine: {
    height: 2.5,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  probeTag: {
    position: 'absolute',
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  layerList: { flex: 1, height: COL_H, gap: 8 },
  layerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatch: { width: 6, height: 34, borderRadius: 3 },
  lowTag: { marginTop: 2, backgroundColor: 'rgba(245,165,36,0.28)', paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.pill },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  mapBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },

  actTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: 18 },
  actRowOn: { backgroundColor: 'rgba(22,119,229,0.07)' },
  pumpTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.oceanBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});