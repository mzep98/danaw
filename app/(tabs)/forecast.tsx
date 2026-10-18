import Text from '@/components/AppText';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import { colors, gradients, radius, shadow } from '@/constants/theme';
import { useLake } from '@/context/LakeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Rect, Stop, LinearGradient as SvgGradient, Text as SvgText } from 'react-native-svg';

type Phase = 'idle' | 'confirm' | 'sending';
type IconName = keyof typeof Ionicons.glyphMap;

const SERIES = [
  { key: 'surface', label: 'Surface', color: colors.sky, obs: [28.3, 28.6, 28.8, 28.7, 28.5, 28.3, 28.2], pred: [28.2, 28.0, 27.7, 27.4, 27.2, 27.0, 26.9] },
  { key: 'mid', label: 'Mid-Water', color: colors.violet, obs: [26.2, 26.1, 26.0, 26.2, 26.4, 26.5, 26.6], pred: [26.6, 26.7, 26.8, 26.9, 26.9, 26.9, 26.9] },
  { key: 'bottom', label: 'Bottom', color: colors.amber, obs: [24.0, 24.0, 24.1, 24.2, 24.3, 24.4, 24.6], pred: [24.6, 25.0, 25.5, 26.0, 26.4, 26.7, 26.9] },
] as const;

const yOf = (t: number) => 170 - (t - 23) * 21.4;
const px = (i: number) => 30 + i * (280 / 12);
const valuesOf = (sr: (typeof SERIES)[number]) => [...sr.obs, ...sr.pred.slice(1)];
const hourLabel = (i: number) => (i === 6 ? 'Now' : `${i > 6 ? '+' : '−'}${Math.abs(i - 6) * 2}h`);

function smooth(pts: number[][]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/* ---------------- interactive chart ---------------- */
function Chart({ visible, idx, onIdx }: { visible: Record<string, boolean>; idx: number; onIdx: (i: number) => void }) {
  const wRef = useRef(1);
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const onIdxRef = useRef(onIdx);
  onIdxRef.current = onIdx;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    const l = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    l.start();
    return () => l.stop();
  }, [fade, pulse]);

  const pick = (x: number) => {
    const vx = (x / wRef.current) * 320;
    onIdxRef.current(Math.min(12, Math.max(0, Math.round((vx - 30) / (280 / 12)))));
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
    })
  ).current;

  return (
    <Animated.View
      style={{ aspectRatio: 320 / 205, opacity: fade }}
      onLayout={(e) => (wRef.current = e.nativeEvent.layout.width)}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 205">
        <Defs>
          {SERIES.map((sr) => (
            <SvgGradient key={sr.key} id={`g-${sr.key}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={sr.color} stopOpacity="0.28" />
              <Stop offset="1" stopColor={sr.color} stopOpacity="0" />
            </SvgGradient>
          ))}
          <SvgGradient id="zone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.ocean} stopOpacity="0.14" />
            <Stop offset="1" stopColor={colors.ocean} stopOpacity="0.03" />
          </SvgGradient>
        </Defs>

        <Rect x={170} y={8} width={140} height={162} fill="url(#zone)" rx={10} />
        <SvgText x={180} y={22} fontSize={8.5} fontFamily="Poppins_600SemiBold" fill={colors.ocean}>
          12-Hour AI Projection
        </SvgText>

        {[24, 26, 28, 30].map((t) => (
          <G key={t}>
            <Line x1={30} y1={yOf(t)} x2={310} y2={yOf(t)} stroke="#E6EBF2" strokeWidth={1} strokeDasharray="2 4" />
            <SvgText x={4} y={yOf(t) + 3} fontSize={9} fontFamily="Poppins_500Medium" fill={colors.muted}>
              {t}°
            </SvgText>
          </G>
        ))}

        <Line x1={170} y1={8} x2={170} y2={170} stroke={colors.navy} strokeWidth={1.5} strokeDasharray="3 3" />

        {SERIES.filter((sr) => visible[sr.key]).map((sr) => {
          const v = valuesOf(sr);
          const all = v.map((t, i) => [px(i), yOf(t)]);
          return (
            <G key={sr.key}>
              <Path d={`${smooth(all)} L310 170 L30 170 Z`} fill={`url(#g-${sr.key})`} />
              <Path d={smooth(all.slice(0, 7))} stroke={sr.color} strokeWidth={3.2} fill="none" strokeLinecap="round" />
              <Path d={smooth(all.slice(6))} stroke={sr.color} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeDasharray="6 5" />
            </G>
          );
        })}

        {idx !== 6 && <Line x1={px(idx)} y1={8} x2={px(idx)} y2={170} stroke={colors.navy} strokeWidth={1} opacity={0.4} />}
        {SERIES.filter((sr) => visible[sr.key]).map((sr) => (
          <Circle key={sr.key} cx={px(idx)} cy={yOf(valuesOf(sr)[idx])} r={5.5} fill="#fff" stroke={sr.color} strokeWidth={3} />
        ))}

        <SvgText x={30} y={195} fontSize={9.5} fontFamily="Poppins_500Medium" fill={colors.muted}>−12h</SvgText>
        <SvgText x={170} y={195} fontSize={9.5} fontFamily="Poppins_700Bold" fill={colors.navy} textAnchor="middle">Now</SvgText>
        <SvgText x={310} y={195} fontSize={9.5} fontFamily="Poppins_500Medium" fill={colors.muted} textAnchor="end">+12h</SvgText>
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${(170 / 320) * 100}%`,
          top: `${(8 / 205) * 100}%`,
          width: 12,
          height: 12,
          marginLeft: -6,
          marginTop: -6,
          borderRadius: 6,
          backgroundColor: colors.coral,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }],
        }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', left: `${(170 / 320) * 100}%`, top: `${(8 / 205) * 100}%`, width: 12, height: 12, marginLeft: -6, marginTop: -6, borderRadius: 6, backgroundColor: colors.coral, borderWidth: 2, borderColor: '#fff' }} />

      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
    </Animated.View>
  );
}

/* ---------------- metric card ---------------- */
function Metric({ icon, tag, tagColor, tagBg, label, value, barColor, note }: { icon: IconName; tag: string; tagColor: string; tagBg: string; label: string; value: number; barColor: string; note: string }) {
  return (
    <Card outerStyle={{ flex: 1 }}>
      <View style={s.metricTop}>
        <View style={[s.metricIcon, { backgroundColor: tagBg }]}>
          <Ionicons name={icon} size={20} color={tagColor} />
        </View>
        <View style={[s.pill, { backgroundColor: tagBg, flexShrink: 1 }]}>
          <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: tagColor }}>{tag}</Text>
        </View>
      </View>
      <Text variant="label" style={{ marginTop: 14, color: colors.muted }}>{label}</Text>
      <Text variant="metric">{value}<Text style={{ fontSize: 16, color: colors.muted, letterSpacing: 0 }}>%</Text></Text>
      <View style={s.track}>
        <View style={[s.fill, { width: `${value}%`, backgroundColor: barColor }]} />
      </View>
      <Text variant="caption" style={{ marginTop: 8 }}>{note}</Text>
    </Card>
  );
}

/* ---------------- why this alert ---------------- */
const EVIDENCE: { icon: IconName; label: string; w: number; color: string; text: string }[] = [
  { icon: 'layers', label: 'Thermal Stratification', w: 78, color: colors.coral, text: 'Surface is cooling faster than mid-water.' },
  { icon: 'water', label: 'DO Depletion Rate', w: 55, color: colors.amber, text: 'Oxygen is falling at Node-02 and Node-03.' },
  { icon: 'flag', label: 'Wind Shear Index', w: 42, color: colors.violet, text: 'Wind pattern matches past mixing events.' },
  { icon: 'speedometer', label: 'Barometric Drop', w: 31, color: colors.sky, text: 'Pressure is falling ahead of a weather front.' },
];

function Why() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Pressable onPress={() => setOpen((o) => !o)} style={s.whyRow}>
        <LinearGradient colors={gradients.brand} style={s.whyIcon}>
          <Ionicons name="bulb" size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text variant="heading">Why This Alert?</Text>
          <Text variant="caption">See what the model is reacting to</Text>
        </View>
        <View style={s.chev}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ocean} />
        </View>
      </Pressable>
      {open && (
        <View style={{ marginTop: 14, gap: 14 }}>
          {EVIDENCE.map((e) => (
            <View key={e.label} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[s.evIcon, { backgroundColor: e.color + '22' }]}>
                <Ionicons name={e.icon} size={18} color={e.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="label">{e.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: e.color }}>{e.w}%</Text>
                </View>
                <View style={[s.track, { marginTop: 6 }]}>
                  <View style={[s.fill, { width: `${e.w}%`, backgroundColor: e.color }]} />
                </View>
                <Text variant="caption" style={{ marginTop: 5 }}>{e.text}</Text>
              </View>
            </View>
          ))}
          <Text variant="caption">Bars show how much each signal influences the forecast.</Text>
        </View>
      )}
    </Card>
  );
}

/* ---------------- screen ---------------- */
export default function Forecast() {
  const [visible, setVisible] = useState<Record<string, boolean>>({ surface: true, mid: true, bottom: true });
  const [idx, setIdx] = useState(6);
  const [phase, setPhase] = useState<Phase>('idle');
  const [acks, setAcks] = useState(0);
  const [secs, setSecs] = useState(4 * 3600 + 11 * 60);
  const { aerationActive: active, setAerators } = useLake();

  useEffect(() => {
    const id = setInterval(() => setSecs((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');

  const sendCommand = () => {
    setPhase('sending');
    setAcks(0);
    setTimeout(() => setAcks(1), 800);
    setTimeout(() => setAcks(2), 1600);
    setTimeout(() => {
      setAerators(true);
      setPhase('idle');
    }, 2400);
  };
  const stop = () => {
    setAerators(false);
    setPhase('idle');
    setAcks(0);
  };

  const strat = active ? 64 : 78;
  const dox = active ? 31 : 53;

  return (
    <Screen title="Predictive Forecast" status="Model updated 10:05, full data window">
      {/* Alert */}
      <LinearGradient colors={active ? gradients.safe : gradients.alert} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.alert}>
        <View style={s.alertTop}>
          <View style={s.alertIcon}>
            <Ionicons name={active ? 'shield-checkmark' : 'warning'} size={36} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>
              {active ? 'Mitigation Active' : 'Inversion Alert'}
            </Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28, letterSpacing: -0.3, marginTop: 2 }}>
              {active ? 'Aeration Is Running' : 'Thermocline Collapse Expected'}
            </Text>
          </View>
        </View>
        <View style={s.alertTiles}>
          {active ? (
            <>
              <View style={s.glass}><Text style={s.glassBig}>2 / 2</Text><Text style={s.glassSmall}>Nodes Confirmed</Text></View>
              <View style={s.glass}><Text style={s.glassBig}>Falling</Text><Text style={s.glassSmall}>Risk Trend</Text></View>
            </>
          ) : (
            <>
              <View style={s.glass}><Text style={s.glassBig}>{h}h {m}m</Text><Text style={s.glassSmall}>Time to Inversion</Text></View>
              <View style={s.glass}><Text style={s.glassBig}>87%</Text><Text style={s.glassSmall}>Model Confidence</Text></View>
            </>
          )}
        </View>
      </LinearGradient>

      {/* Chart */}
      <Card>
        <Text variant="title" style={{ fontSize: 20 }}>Observed + Forecast</Text>
        <Text variant="caption">Temperature by depth. Drag across the chart to inspect.</Text>
        <View style={s.chips}>
          {SERIES.map((sr) => {
            const on = visible[sr.key];
            return (
              <Pressable key={sr.key} onPress={() => setVisible((p) => ({ ...p, [sr.key]: !p[sr.key] }))} style={[s.chip, on && { backgroundColor: sr.color + '22', borderColor: sr.color }]}>
                <View style={[s.chipDot, { backgroundColor: on ? sr.color : '#C8D1DE' }]} />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? colors.text : colors.muted }}>{sr.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Chart visible={visible} idx={idx} onIdx={setIdx} />

        <View style={s.readout}>
          <View style={[s.timePill, idx > 6 && { backgroundColor: colors.oceanBg }]}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: idx > 6 ? colors.ocean : colors.navy }}>{hourLabel(idx)}</Text>
            <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.muted }}>{idx > 6 ? 'Predicted' : idx === 6 ? 'Current' : 'Observed'}</Text>
          </View>
          {SERIES.filter((sr) => visible[sr.key]).map((sr) => (
            <View key={sr.key} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: sr.color }}>{valuesOf(sr)[idx].toFixed(1)}°C</Text>
              <Text variant="caption" style={{ fontSize: 11 }}>{sr.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Metrics */}
      <View style={s.row}>
        <Metric icon="layers" tag="High Influence" tagColor={colors.amberInk} tagBg={colors.amberBg} label="Stratification Index" value={strat} barColor={colors.violet} note="Relative model feature" />
        <Metric icon="water" tag={active ? 'Falling' : 'Rising'} tagColor={active ? colors.greenInk : '#B3342E'} tagBg={active ? colors.greenBg : colors.coralBg} label="DO Depletion Rate" value={dox} barColor={active ? colors.green : colors.coral} note="Estimated change over window" />
      </View>

      <Why />

      {/* Recommended action */}
      {!active && (
        <View style={s.action}>
          <View style={s.actionIcon}><Ionicons name="pulse" size={24} color={colors.coral} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={{ fontSize: 16 }}>Recommended Action</Text>
            <Text style={{ fontSize: 13, color: '#8A4A1A', lineHeight: 19, marginTop: 2 }}>
              Begin aeration before 14:20 to keep surface oxygen above 5.0 mg/L.
            </Text>
          </View>
        </View>
      )}

      {/* Controls */}
      {phase === 'idle' && !active && (
        <Pressable onPress={() => setPhase('confirm')}>
          <LinearGradient colors={gradients.alert} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
            <Ionicons name="flash" size={20} color="#fff" />
            <Text style={s.btnText}>Trigger Pre-emptive Aeration</Text>
          </LinearGradient>
        </Pressable>
      )}
      {phase === 'sending' && (
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.btn, { flexDirection: 'column', gap: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color="#fff" />
            <Text style={s.btnText}>Sending Command</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {[1, 2].map((n) => (
              <View key={n} style={[s.ack, acks >= n && { backgroundColor: '#fff' }]}>
                {acks >= n && <Ionicons name="checkmark" size={13} color={colors.ocean} />}
              </View>
            ))}
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' }}>{acks} of 2 nodes confirmed</Text>
          </View>
        </LinearGradient>
      )}
      {active && phase === 'idle' && (
        <Pressable onPress={stop} style={s.stopBtn}>
          <Ionicons name="stop-circle" size={20} color={colors.text} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Stop Aeration</Text>
        </Pressable>
      )}
      <Text variant="caption" style={{ textAlign: 'center' }}>Secure reverse-mesh command, confirmed by 2 nodes</Text>

      {/* Confirm modal */}
      <Modal transparent animationType="fade" visible={phase === 'confirm'}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <LinearGradient colors={gradients.alert} style={s.modalIcon}>
              <Ionicons name="flash" size={28} color="#fff" />
            </LinearGradient>
            <Text variant="title" style={{ marginTop: 14 }}>Trigger Pre-emptive Aeration?</Text>
            <Text variant="caption" style={{ fontSize: 14, lineHeight: 21, marginTop: 6 }}>
              A secure command goes through the mesh to both devices below. Each must confirm.
            </Text>
            {[['aperture', 'Aerator Array 1'], ['water', 'O₂ Pump Station']].map(([ic, n]) => (
              <View key={n} style={s.devRow}>
                <Ionicons name={ic as IconName} size={20} color={colors.ocean} />
                <Text variant="label">{n}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <Pressable onPress={() => setPhase('idle')} style={[s.modalBtn, { backgroundColor: '#EEF2F8' }]}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={sendCommand} style={[s.modalBtn, { backgroundColor: colors.coral }]}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: '#fff' }}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  alert: { borderRadius: 28, padding: 20, ...shadow(colors.coral, 2) },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  alertIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  alertTiles: { flexDirection: 'row', gap: 10, marginTop: 18 },
  glass: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  glassBig: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  glassSmall: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  chips: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border },
  chipDot: { width: 9, height: 9, borderRadius: 5 },
  readout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, backgroundColor: '#F4F7FB', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  timePill: { backgroundColor: '#E3E9F2', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 14 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  track: { height: 7, borderRadius: 4, backgroundColor: '#E6EBF2', marginTop: 10, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  whyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  whyIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  chev: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.oceanBg, alignItems: 'center', justifyContent: 'center' },
  evIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  action: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 22, backgroundColor: '#FFF4E3', borderWidth: 1, borderColor: '#F6DDB8', alignItems: 'center' },
  actionIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFE3D0', alignItems: 'center', justifyContent: 'center' },
  btn: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 16, borderRadius: 20, ...shadow(colors.coral, 2) },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  ack: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  stopBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border },
  overlay: { flex: 1, backgroundColor: 'rgba(6,26,46,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 28, padding: 22 },
  modalIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  devRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F4F7FB', borderRadius: 14, padding: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
});