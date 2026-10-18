import Text from '@/components/AppText';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import { colors, gradients, radius, shadow } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

type IconName = keyof typeof Ionicons.glyphMap;

const PHOTO = require('@/assets/images/fish.jpeg');

// How the photo fits inside the camera card
const src = Image.resolveAssetSource(PHOTO);
const IMG_RATIO = src.width / src.height;
const CAM = Math.max(0.7, IMG_RATIO);
const V = Math.min(1, IMG_RATIO / CAM);
const OFFSET = (1 - V) / 2;

const DETECTIONS = [
  { id: 'Fish-05', conf: 92, x: 0.303, y: 0.165, w: 0.2, h: 0.19 },
  { id: 'Fish-21', conf: 90, x: 0.69, y: 0.24, w: 0.285, h: 0.26 },
  { id: 'Tilapia', conf: 96, x: 0.34, y: 0.336, w: 0.352, h: 0.294 },
  { id: 'Fish-31', conf: 88, x: 0.074, y: 0.7, w: 0.296, h: 0.2 },
  { id: 'Fish-09', conf: 91, x: 0.5, y: 0.74, w: 0.28, h: 0.17 },
  { id: 'Fish-27', conf: 68, x: 0.498, y: 0.189, w: 0.12, h: 0.173 },
];

/* ---------- schooling density story ---------- */
const HEALTHY: [number, number] = [30, 45];
const MAXC = 50;
const hhmm = (start: number, step: number) =>
  Array.from({ length: 12 }, (_, i) => {
    const t = start + i * step;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  });

const RANGES = {
  '1H': {
    times: hhmm(9 * 60 + 15, 5),
    values: [38, 40, 39, 41, 37, 24, 19, 28, 35, 39, 41, 40],
    insight: 'Density dipped at 09:42 during a rapid ascent and recovered by 10:08. The school is tight again.',
  },
  '6H': {
    times: hhmm(4 * 60 + 45, 30),
    values: [40, 42, 41, 39, 43, 38, 41, 40, 42, 39, 22, 38],
    insight: 'Steady all morning except one brief scatter near 09:45. No action needed.',
  },
  '24H': {
    times: hhmm(12 * 60 + 15, 120),
    values: [41, 40, 43, 42, 39, 36, 32, 28, 31, 38, 42, 41],
    insight: 'Density loosens overnight, which is normal resting behavior, and is healthy again this morning.',
  },
} as const;
type Range = keyof typeof RANGES;

const EVENTS: { id: string; time: string; title: string; sub: string; detail: string; color: string; icon: IconName; bar: number }[] = [
  {
    id: 'a', time: '10:08', title: 'School Cohesion Restored', sub: 'Density returned to the healthy range',
    detail: 'Fish count per frame climbed back above 30 and has held steady since. No action needed.',
    color: colors.green, icon: 'checkmark-circle', bar: 11,
  },
  {
    id: 'b', time: '09:42', title: 'Rapid Ascent Detected', sub: '12 fish at 0.8 m/s vertical speed',
    detail: 'A group swam toward the surface quickly, which can signal low oxygen at depth. Density dropped for about 25 minutes.',
    color: colors.amber, icon: 'trending-up', bar: 5,
  },
];

function Slider({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const width = useRef(1);
  const update = (x: number) => {
    const ratio = Math.min(1, Math.max(0, x / width.current));
    onChange(Math.round(min + ratio * (max - min)));
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => update(e.nativeEvent.locationX),
      onPanResponderMove: (e) => update(e.nativeEvent.locationX),
    })
  ).current;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <View style={s.sliderHit} onLayout={(e) => (width.current = e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <View style={s.sliderTrack} pointerEvents="none">
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 8, width: `${pct}%` }} />
      </View>
      <View style={[s.sliderThumb, { left: `${pct}%` }]} pointerEvents="none" />
    </View>
  );
}

const fmt = (total: number) => {
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const sec = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
};

export default function Vision() {
  const [ai, setAi] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [threshold, setThreshold] = useState(72);
  const [range, setRange] = useState<Range>('1H');
  const [secs, setSecs] = useState(0);
  const [camH, setCamH] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [bar, setBar] = useState<number | null>(null);
  const [openEv, setOpenEv] = useState<string | null>('b');

  const scan = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!playing) return;
    const loop = Animated.loop(Animated.timing(scan, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [playing, scan]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [playing]);
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [0, camH] });

  const boxes = DETECTIONS.filter((d) => d.conf >= threshold).flatMap((d) => {
    const y0 = Math.max(d.y, OFFSET);
    const y1 = Math.min(d.y + d.h, OFFSET + V);
    if (y1 - y0 < 0.03) return [];
    return [{ ...d, left: d.x * 100, width: d.w * 100, top: ((y0 - OFFSET) / V) * 100, height: ((y1 - y0) / V) * 100 }];
  });
  const picked = DETECTIONS.find((d) => d.id === sel && d.conf >= threshold);

  const stress = 28;
  const R = 38;
  const C = 2 * Math.PI * R;
  const clock = fmt(10 * 3600 + 12 * 60 + 4 + secs);

  const data = RANGES[range];
  const shown = bar ?? 11;
  const cur = data.values[shown];
  const inBand = cur >= HEALTHY[0] && cur <= HEALTHY[1];
  const lastOk = data.values[11] >= HEALTHY[0];

  const openEvent = (id: string) => setOpenEv((o) => (o === id ? null : id));
  const showInChart = (b: number) => {
    setRange('1H');
    setBar(b);
  };

  return (
    <Screen title="Bio-Monitoring" status={`Camera C-03, ${playing ? 'live feed' : 'paused'}`} live={playing}>
      {/* Camera */}
      <View style={[s.cam, { aspectRatio: CAM }]} onLayout={(e) => setCamH(e.nativeEvent.layout.height)}>
        <Image
          source={PHOTO}
          resizeMode="cover"
          style={{ position: 'absolute', left: 0, width: '100%', aspectRatio: IMG_RATIO, top: `${-(OFFSET / V) * 100}%` }}
        />

        {ai &&
          boxes.map((b) => {
            const on = b.id === sel;
            return (
              <Pressable
                key={b.id}
                onPress={() => setSel(on ? null : b.id)}
                style={[s.box, { left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` }, on && s.boxOn]}
              >
                <View style={[s.boxTag, on && { backgroundColor: '#fff' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#06301F' }} numberOfLines={1}>
                    {b.id} · {b.conf}%
                  </Text>
                </View>
              </Pressable>
            );
          })}

        {ai && <Animated.View pointerEvents="none" style={[s.scanLine, { transform: [{ translateY: scanY }] }]} />}

        <View style={s.liveBadge}>
          <View style={[s.dot, { backgroundColor: playing ? colors.coral : colors.amber }]} />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{playing ? 'Live' : 'Paused'}</Text>
        </View>
        {ai && (
          <View style={s.trackBadge}>
            <Text style={{ color: '#4ADE9B', fontSize: 12, fontWeight: '700' }}>
              Tracking {boxes.length} of {DETECTIONS.length}
            </Text>
          </View>
        )}
        <Text style={s.stamp}>2026-10-17  {clock}</Text>
        <Text style={s.stampRight}>CAM C-03  ·  24 FPS</Text>
      </View>

      {/* Selected fish */}
      {picked && ai && (
        <View style={s.pickCard}>
          <View style={s.pickIcon}><Ionicons name="fish" size={20} color={colors.greenInk} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={{ fontSize: 15 }}>{picked.id}</Text>
            <Text variant="caption">{picked.conf}% confidence, swimming normally</Text>
          </View>
          <Pressable onPress={() => setSel(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={colors.muted} />
          </Pressable>
        </View>
      )}

      {/* Controls */}
      <View style={s.controls}>
        <View style={s.segment}>
          {[false, true].map((v) => (
            <Pressable key={String(v)} onPress={() => setAi(v)} style={[s.segBtn, ai === v && s.segActive]}>
              <Ionicons name={v ? 'scan' : 'videocam'} size={16} color={ai === v ? colors.ocean : colors.muted} />
              <Text style={{ fontWeight: '700', fontSize: 13, color: ai === v ? colors.ocean : colors.muted }}>
                {v ? 'AI Annotated' : 'Raw Feed'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => setPlaying((p) => !p)} style={s.iconBtn}>
          <Ionicons name={playing ? 'pause' : 'play'} size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Confidence */}
      <Card>
        <View style={s.rowBetween}>
          <Text variant="heading" style={{ fontSize: 16 }}>Detection Confidence</Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ocean }}>{threshold}%</Text>
        </View>
        <Slider value={threshold} min={50} max={99} onChange={setThreshold} />
        <Text variant="caption">Boxes below this confidence are hidden.</Text>
      </Card>

      {/* Behavioral analytics */}
      <Card>
        <View style={s.rowBetween}>
          <Text variant="title" style={{ fontSize: 20 }}>Behavioral Analytics</Text>
          <View style={[s.pill, { backgroundColor: colors.greenBg }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.greenInk }}>Normal</Text>
          </View>
        </View>

        <View style={s.stressRow}>
          <View style={s.ringWrap}>
            <Svg width={96} height={96} viewBox="0 0 96 96">
              <Circle cx={48} cy={48} r={R} stroke="#E6EBF2" strokeWidth={9} fill="none" />
              <G rotation={-90} origin="48, 48">
                <Circle cx={48} cy={48} r={R} stroke={colors.green} strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - stress / 100)} />
              </G>
            </Svg>
            <View style={s.ringCenter}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{stress}%</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={{ fontSize: 16 }}>Estimated Stress Level</Text>
            <Text variant="caption">Within the normal range for this observation window.</Text>
            <Text variant="caption">Estimated from video, not a biological diagnosis.</Text>
          </View>
        </View>

        <View style={s.tiles}>
          {([
            ['Swimming', 'Normal', 'pulse'],
            ['Surface Activity', 'Low', 'water'],
            ['Feeding', 'Active', 'restaurant'],
          ] as [string, string, IconName][]).map(([l, v, ic]) => (
            <View key={l} style={s.tile}>
              <Ionicons name={ic} size={18} color={colors.ocean} />
              <Text variant="label" style={{ marginTop: 6 }}>{v}</Text>
              <Text variant="caption" style={{ fontSize: 11.5 }}>{l}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Schooling density */}
      <Card>
        <View style={s.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text variant="title" style={{ fontSize: 20 }}>Schooling Density</Text>
            <Text variant="caption">How tightly the fish are grouped</Text>
          </View>
          <View style={s.rangeRow}>
            {(['1H', '6H', '24H'] as const).map((r) => (
              <Pressable key={r} onPress={() => { setRange(r); setBar(null); }} style={[s.rangeBtn, range === r && s.rangeActive]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: range === r ? colors.ocean : colors.muted }}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.summary}>
          <View>
            <Text style={{ fontSize: 34, fontWeight: '800', color: colors.text, letterSpacing: -1 }}>
              {cur}
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.muted, letterSpacing: 0 }}> fish per frame</Text>
            </Text>
            <Text variant="caption">{bar === null ? 'Now' : `At ${data.times[bar]}`}</Text>
          </View>
          <View style={[s.pill, { backgroundColor: inBand ? colors.greenBg : colors.amberBg }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: inBand ? colors.greenInk : colors.amberInk }}>
              {inBand ? 'Healthy' : cur < HEALTHY[0] ? 'Scattered' : 'Crowded'}
            </Text>
          </View>
        </View>

        <View style={s.bandLegend}>
          <View style={s.bandSwatch} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.greenInk }}>
            Healthy Range: {HEALTHY[0]}–{HEALTHY[1]} fish per frame
          </Text>
        </View>
        <View style={s.chart}>
          <View style={[s.band, { bottom: `${(HEALTHY[0] / MAXC) * 100}%`, height: `${((HEALTHY[1] - HEALTHY[0]) / MAXC) * 100}%` }]} />
          {data.values.map((v, i) => {
            const ok = v >= HEALTHY[0];
            const on = bar === i;
            return (
              <Pressable key={i} onPress={() => setBar(on ? null : i)} style={s.barCol}>
                <LinearGradient
                  colors={ok ? [colors.sky, colors.ocean] : ['#FFD08A', colors.amber]}
                  style={[s.bar, { height: `${(v / MAXC) * 100}%` }, on && { borderWidth: 2.5, borderColor: colors.navy }]}
                />
              </Pressable>
            );
          })}
        </View>
        <View style={s.axis}>
          {[0, 5, 11].map((i) => (
            <Text key={i} variant="caption" style={{ fontSize: 11 }}>{data.times[i]}</Text>
          ))}
        </View>

        <View style={[s.insight, { backgroundColor: lastOk ? colors.greenBg : colors.amberBg }]}>
          <Ionicons name={lastOk ? 'checkmark-circle' : 'alert-circle'} size={20} color={lastOk ? colors.green : colors.amber} />
          <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500', color: colors.text }}>{data.insight}</Text>
        </View>
      </Card>

      {/* Event timeline */}
      <Card>
        <Text variant="title" style={{ fontSize: 20 }}>Event Timeline</Text>
        <Text variant="caption">Tap an event for details</Text>
        {EVENTS.map((e, i) => {
          const open = openEv === e.id;
          return (
            <Pressable key={e.id} onPress={() => openEvent(e.id)} style={s.event}>
              <View style={{ alignItems: 'center' }}>
                <View style={[s.eventIcon, { backgroundColor: e.color + '24' }]}>
                  <Ionicons name={e.icon} size={20} color={e.color} />
                </View>
                {i < EVENTS.length - 1 && <View style={s.eventLine} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 14 }}>
                <View style={s.rowBetween}>
                  <Text variant="heading" style={{ fontSize: 15 }}>{e.title}</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.muted }}>{e.time}</Text>
                </View>
                <Text variant="caption">{e.sub}</Text>
                {open && (
                  <View style={s.eventDetail}>
                    <Text style={{ fontSize: 13, lineHeight: 19, color: colors.text }}>{e.detail}</Text>
                    <Pressable onPress={() => showInChart(e.bar)} style={s.eventBtn}>
                      <Ionicons name="bar-chart" size={15} color={colors.ocean} />
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ocean }}>Show in Density Chart</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  cam: { borderRadius: 28, overflow: 'hidden', backgroundColor: '#061B2C', ...shadow(colors.navy, 2) },
  box: { position: 'absolute', borderWidth: 2, borderColor: '#4ADE9B', backgroundColor: 'rgba(74,222,155,0.08)' },
  boxOn: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.15)' },
  boxTag: { alignSelf: 'flex-start', backgroundColor: '#4ADE9B', paddingHorizontal: 6, paddingVertical: 2 },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: 'rgba(91,229,255,0.75)' },
  liveBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(6,27,44,0.82)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4 },
  trackBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(6,27,44,0.82)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  stamp: { position: 'absolute', bottom: 10, left: 12, color: '#fff', fontSize: 11, fontFamily: 'Poppins_600SemiBold', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 },
  stampRight: { position: 'absolute', bottom: 10, right: 12, color: '#fff', fontSize: 11, fontFamily: 'Poppins_600SemiBold', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 },

  pickCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: colors.greenBg },
  pickIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  controls: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  segment: { flex: 1, flexDirection: 'row', backgroundColor: '#E3E9F2', borderRadius: 18, padding: 4 },
  segBtn: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segActive: { backgroundColor: '#fff', ...shadow(colors.navy, 1) },
  iconBtn: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  sliderHit: { height: 38, justifyContent: 'center' },
  sliderTrack: { height: 8, borderRadius: 4, backgroundColor: '#E6EBF2', overflow: 'hidden' },
  sliderThumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, marginLeft: -12, backgroundColor: '#fff', borderWidth: 4, borderColor: colors.ocean, ...shadow(colors.ocean, 1) },

  stressRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  ringWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tile: { flex: 1, backgroundColor: '#F4F7FB', borderRadius: 16, padding: 12 },

  rangeRow: { flexDirection: 'row', backgroundColor: '#EEF2F8', borderRadius: 12, padding: 3 },
  rangeBtn: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 9 },
  rangeActive: { backgroundColor: '#fff' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130, marginTop: 8 },
  bandLegend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  bandSwatch: { width: 18, height: 11, borderRadius: 3, backgroundColor: 'rgba(18,177,119,0.18)', borderWidth: 1.5, borderColor: 'rgba(18,177,119,0.5)' },
  band: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(18,177,119,0.1)', borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: 'rgba(18,177,119,0.4)', borderStyle: 'dashed', borderRadius: 6 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 16 },

  event: { flexDirection: 'row', gap: 12, marginTop: 14 },
  eventIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  eventLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4, borderRadius: 1 },
  eventDetail: { marginTop: 10, backgroundColor: '#F4F7FB', borderRadius: 14, padding: 12, gap: 10 },
  eventBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.oceanBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
});