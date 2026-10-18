import Text from '@/components/AppText';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import { colors, gradients, radius, shadow } from '@/constants/theme';
import { LAYERS, useLake, type LayerKey } from '@/context/LakeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

/* ---------------- map geometry (300 x 380 canvas) ---------------- */
const VB_W = 300;
const VB_H = 380;
const CX = 150;
const CY = 195;
const SX = 0.94;
const SY = 1.08;
const RADII = [122, 110, 128, 117, 106, 124, 130, 113, 119, 126];

/** Smooth closed curve through points (Catmull-Rom to Bezier). */
function closed(p: number[][]) {
  const n = p.length;
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}

function blob(scale: number, dx = 0, dy = 0, rot = 0) {
  const n = RADII.length;
  return closed(
    RADII.map((r, i) => {
      const a = rot + (i / n) * Math.PI * 2;
      return [CX + dx + Math.cos(a) * r * scale * SX, CY + dy + Math.sin(a) * r * scale * SY];
    })
  );
}

const LAKE = blob(1);
const CONTOUR_SCALES = [0.84, 0.67, 0.5, 0.34, 0.19];
const CONTOURS = CONTOUR_SCALES.map((sc) => blob(sc, (1 - sc) * 14, (1 - sc) * 16, (1 - sc) * 0.5));
const LAND_RINGS = [1.2, 1.4, 1.62, 1.86].map((sc) => blob(sc, 0, 0, 0.3));
const RAMP = ['#BFE6F7', '#95D4F0', '#6AC0EA', '#43A8DE', '#2A8CCF', '#1B6DB3'];
const HAZARD = closed([
  [108, 262],
  [152, 250],
  [196, 266],
  [204, 298],
  [160, 312],
  [116, 300],
]);

const LAYER_IDX: Record<LayerKey, number> = { surface: 0, mid: 2, bottom: 4 };
const LAYER_NAME: Record<LayerKey, string> = { surface: 'Surface', mid: 'Mid-Water', bottom: 'Bottom' };
const CONTOUR_LABELS: { idx: number; text: string }[] = [
  { idx: 0, text: '2 m' },
  { idx: 2, text: '5 m' },
  { idx: 4, text: '8 m' },
];

const NODES = [
  { id: '01', x: 112, y: 130, role: 'Gateway', tOff: 0.6, doOff: 0.4, rssi: -40, bat: 100 },
  { id: '08', x: 214, y: 118, role: 'Sensor', tOff: 0.2, doOff: 0.1, rssi: -66, bat: 84 },
  { id: '03', x: 158, y: 208, role: 'Sensor', tOff: -0.3, doOff: -0.5, rssi: -61, bat: 91 },
  { id: '02', x: 190, y: 282, role: 'Relay', tOff: -0.6, doOff: -0.8, rssi: -52, bat: 98 },
];

const idxOf = (k: LayerKey) => LAYERS.findIndex((l) => l.key === k);

/* ---------------- depth switch with sliding thumb ---------------- */
function DepthSwitch({ layer, onSelect }: { layer: LayerKey; onSelect: (k: LayerKey) => void }) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const idx = idxOf(layer);
  const seg = w / 3;

  useEffect(() => {
    if (w) Animated.spring(x, { toValue: idx * seg, useNativeDriver: true, bounciness: 7, speed: 16 }).start();
  }, [idx, seg, w, x]);

  return (
    <View style={s.switch} onLayout={(e) => setW(e.nativeEvent.layout.width - 8)}>
      {w > 0 && (
        <Animated.View style={[s.thumb, { width: seg, transform: [{ translateX: x }] }]}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
      {LAYERS.map((l) => {
        const on = l.key === layer;
        return (
          <Pressable key={l.key} onPress={() => onSelect(l.key)} style={s.switchBtn}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : colors.text }}>{LAYER_NAME[l.key]}</Text>
            <Text style={{ fontSize: 11, fontWeight: '500', color: on ? 'rgba(255,255,255,0.85)' : colors.muted }}>
              {l.depth.toFixed(1)} m
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- hazard pulse ---------------- */
function HazardPulse() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: '50%',
        top: `${(288 / VB_H) * 100}%`,
        width: 120,
        height: 120,
        marginLeft: -60,
        marginTop: -60,
        borderRadius: 60,
        backgroundColor: colors.coral,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.3] }) }],
      }}
    />
  );
}

/* ---------------- screen ---------------- */
export default function MapScreen() {
  const { layer, setLayer, layers } = useLake();
  const [vis, setVis] = useState({ bathy: true, nodes: true, thermal: false });
  const [selected, setSelected] = useState<string | null>(null);
  const lastId = useRef('03');
  const drawer = useRef(new Animated.Value(0)).current;
    const params = useLocalSearchParams<{ view?: string; node?: string; t?: string }>();
  useEffect(() => {
    if (params.view === 'thermal') setVis({ bathy: true, nodes: true, thermal: true });
    else if (params.view === 'bathy') setVis({ bathy: true, nodes: true, thermal: false });
    if (params.node) setSelected(params.node);
    else if (params.view) setSelected(null);
  }, [params.view, params.node, params.t]);

  if (selected) lastId.current = selected;
  const node = NODES.find((n) => n.id === lastId.current)!;
  const read = layers[layer];
  const temp = read.temp + node.tOff;
  const dox = Math.max(0.5, read.doLevel + node.doOff);
  const idx = idxOf(layer);

  useEffect(() => {
    Animated.spring(drawer, { toValue: selected ? 1 : 0, useNativeDriver: true, bounciness: 6, speed: 14 }).start();
  }, [selected, drawer]);

  const toggle = (k: keyof typeof vis) => setVis((p) => ({ ...p, [k]: !p[k] }));
  const activeContour = LAYER_IDX[layer];

  const depthLabels = useMemo(
    () =>
      CONTOUR_LABELS.map((c) => {
        const sc = CONTOUR_SCALES[c.idx];
        return { text: c.text, y: CY + (1 - sc) * 16 - 116 * SY * sc + 4 };
      }),
    []
  );

  return (
    <Screen title="Lake Basin Map" status="Topobathymetric survey, Sector Alpha" live={false}>
      {/* Layer chips */}
      <View style={s.chips}>
        {(
          [
            ['bathy', 'Bathymetry', 'layers'],
            ['nodes', 'Nodes', 'radio'],
            ['thermal', 'Thermal', 'thermometer'],
          ] as const
        ).map(([key, label, icon]) => {
          const on = vis[key];
          return (
            <Pressable key={key} onPress={() => toggle(key)} style={[s.chip, on && s.chipActive]}>
              <Ionicons name={icon} size={15} color={on ? '#fff' : colors.muted} />
              <Text style={{ fontWeight: '700', fontSize: 13, color: on ? '#fff' : colors.text }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Map */}
      <View style={s.mapWrap}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice">
          <Defs>
            <ClipPath id="lakeClip">
              <Path d={LAKE} />
            </ClipPath>
            <RadialGradient id="heat" cx="32%" cy="26%" r="85%">
              <Stop offset="0" stopColor="#F0534A" stopOpacity="0.75" />
              <Stop offset="0.45" stopColor="#F5A524" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#1677E5" stopOpacity="0.3" />
            </RadialGradient>
          </Defs>

          {/* land */}
          <Rect width={VB_W} height={VB_H} fill="#E6F0CF" onPress={() => setSelected(null)} />
          <Circle cx={22} cy={30} r={46} fill="#D6E8B4" opacity={0.7} />
          <Circle cx={285} cy={360} r={56} fill="#D6E8B4" opacity={0.7} />
          {LAND_RINGS.map((d, i) => (
            <Path key={i} d={d} fill="none" stroke="#D3E4B1" strokeWidth={1.2} opacity={0.9 - i * 0.15} />
          ))}

          {/* shore road */}
          <Path d="M-10 330 C 30 270, 14 180, 40 110 S 90 20, 120 -10" stroke="#E2D8B4" strokeWidth={7} fill="none" strokeLinecap="round" />
          <Path d="M-10 330 C 30 270, 14 180, 40 110 S 90 20, 120 -10" stroke="#FFFFFF" strokeWidth={4.5} fill="none" strokeLinecap="round" />

          {/* beach and lake */}
          <Path d={LAKE} fill="none" stroke="#F3EAC6" strokeWidth={9} strokeLinejoin="round" />
          <Path d={LAKE} fill={vis.bathy ? RAMP[0] : '#6AC0EA'} />

          {vis.bathy &&
            CONTOURS.map((d, i) => (
              <Path
                key={i}
                d={d}
                fill={RAMP[i + 1]}
                stroke={i === activeContour ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
                strokeWidth={i === activeContour ? 2.6 : 1}
                strokeDasharray={i === activeContour ? '6 4' : undefined}
              />
            ))}

          {vis.thermal && (
            <G clipPath="url(#lakeClip)">
              <Rect width={VB_W} height={VB_H} fill="url(#heat)" />
            </G>
          )}

          <Path d={LAKE} fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinejoin="round" />

          {/* depth labels */}
          {vis.bathy &&
            depthLabels.map((l) => (
              <SvgText key={l.text} x={CX + 6} y={l.y} fontSize={9} fontFamily="Poppins_700Bold" fill="#FFFFFF" textAnchor="middle" opacity={0.95}>
                {l.text}
              </SvgText>
            ))}

          {/* fish cages */}
          {[
            [240, 200],
            [252, 224],
            [238, 246],
            [60, 214],
            [70, 238],
          ].map(([x, y]) => (
            <G key={`${x}-${y}`}>
              <Circle cx={x} cy={y} r={7} fill="rgba(255,255,255,0.3)" stroke="#FFFFFF" strokeWidth={2} />
              <Circle cx={x} cy={y} r={2} fill="#FFFFFF" />
            </G>
          ))}

          {/* upwelling hazard */}
          <Path d={HAZARD} fill="rgba(240,83,74,0.28)" stroke={colors.coral} strokeWidth={2.2} strokeDasharray="7 5" />
          <Rect x={96} y={273} width={80} height={19} rx={9.5} fill={colors.coral} />
          <SvgText x={136} y={286} fontSize={9} fontFamily="Poppins_700Bold" fill="#FFFFFF" textAnchor="middle">
            Upwelling Zone
          </SvgText>

          {/* node pins */}
          {vis.nodes &&
            NODES.map((n) => {
              const active = n.id === selected;
              const fill = active ? colors.navy : n.role === 'Gateway' ? colors.violet : colors.ocean;
              return (
                <G key={n.id} transform={`translate(${n.x} ${n.y}) scale(${active ? 1.3 : 1})`} onPress={() => setSelected(active ? null : n.id)}>
                  {active && <Circle cx={0} cy={-18} r={22} fill="rgba(11,42,69,0.18)" />}
                  <Ellipse cx={0} cy={1} rx={7} ry={2.5} fill="rgba(11,42,69,0.3)" />
                  <Path
                    d="M0 0 C-3 -6 -13 -14 -13 -23 A13 13 0 1 1 13 -23 C13 -14 3 -6 0 0 Z"
                    fill={fill}
                    stroke="#FFFFFF"
                    strokeWidth={2.2}
                  />
                  <SvgText x={0} y={-19} fontSize={10} fontFamily="Poppins_700Bold" fill="#FFFFFF" textAnchor="middle">
                    {n.id}
                  </SvgText>
                  <Circle cx={0} cy={-18} r={22} fill="transparent" />
                </G>
              );
            })}
        </Svg>

        <HazardPulse />

        {/* legend */}
        <View style={s.legend}>
          {[
            ['#95D4F0', 'Shallow'],
            ['#43A8DE', 'Mid'],
            ['#1B6DB3', 'Deep'],
          ].map(([c, l]) => (
            <View key={l} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: c }]} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{l}</Text>
            </View>
          ))}
        </View>

        {/* compass */}
        <View style={s.compass}>
          <Ionicons name="navigate" size={18} color={colors.coral} style={{ transform: [{ rotate: '-45deg' }] }} />
        </View>

        {/* scale bar */}
        <View style={s.scale}>
          <View style={s.scaleBar} />
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.navy }}>200 m</Text>
        </View>

        {/* node drawer */}
        <Animated.View
          pointerEvents={selected ? 'auto' : 'none'}
          style={[
            s.drawer,
            {
              opacity: drawer,
              transform: [{ translateY: drawer.interpolate({ inputRange: [0, 1], outputRange: [260, 0] }) }],
            },
          ]}
        >
          <View style={s.drawerTop}>
            <LinearGradient
              colors={node.role === 'Gateway' ? (['#7B5CFA', '#A78BFA'] as const) : gradients.brand}
              style={s.drawerPin}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{node.id}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text variant="title" style={{ fontSize: 19, lineHeight: 25 }}>Node-{node.id}</Text>
              <Text variant="caption">
                {node.role} at {LAYERS[idx].depth.toFixed(1)} m
              </Text>
            </View>
            <View style={[s.badge, { backgroundColor: colors.greenBg }]}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.greenInk }}>Online</Text>
            </View>
            <Pressable onPress={() => setSelected(null)} style={s.close} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>

          <View style={s.tiles}>
            <View style={s.tile}>
              <Text variant="caption" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 11.5 }}>Temperature</Text>
              <Text style={s.tileValue}>
                {temp.toFixed(1)}
                <Text style={s.tileUnit}> °C</Text>
              </Text>
            </View>
            <View style={[s.tile, dox < 4.5 && { backgroundColor: colors.amberBg }]}>
              <Text variant="caption" style={{ fontSize: 11.5 }}>Dissolved O₂</Text>
              <Text style={[s.tileValue, dox < 4.5 && { color: colors.amberInk }]}>
                {dox.toFixed(1)}
                <Text style={s.tileUnit}> mg/L</Text>
              </Text>
            </View>
            <View style={s.tile}>
              <Text variant="caption" style={{ fontSize: 11.5 }}>Signal</Text>
              <Text style={s.tileValue}>
                {node.rssi}
                <Text style={s.tileUnit}> dBm</Text>
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Depth control */}
      <Card>
        <View style={s.depthTop}>
          <View>
            <Text variant="title" style={{ fontSize: 19 }}>Active Depth</Text>
            <Text variant="caption">Choose a layer to slice the lake</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ocean, letterSpacing: -0.5 }}>
            {LAYERS[idx].depth.toFixed(1)} m
          </Text>
        </View>
        <DepthSwitch layer={layer} onSelect={setLayer} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.ocean, borderColor: colors.ocean, ...shadow(colors.ocean, 1) },

  mapWrap: {
    width: '100%',
    aspectRatio: VB_W / VB_H,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#E6F0CF',
    ...shadow(colors.navy, 2),
  },
  legend: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    ...shadow(colors.navy, 1),
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  compass: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(colors.navy, 1),
  },
  scale: { position: 'absolute', left: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  scaleBar: { width: 42, height: 6, borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: colors.navy },

  drawer: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    ...shadow(colors.navy, 3),
  },
  drawerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerPin: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEF2F8', alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 12 },
   tile: { flex: 1, minWidth: 0, backgroundColor: '#F2F6FB', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10 },
  tileValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2, letterSpacing: -0.3 },
  tileUnit: { fontSize: 11, fontWeight: '500', color: colors.muted, letterSpacing: 0 },

  depthTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  switch: { flexDirection: 'row', backgroundColor: '#EEF2F8', borderRadius: 18, padding: 4 },
  thumb: { position: 'absolute', left: 4, top: 4, bottom: 4, borderRadius: 14, overflow: 'hidden' },
  switchBtn: { flex: 1, alignItems: 'center', paddingVertical: 11 },
});