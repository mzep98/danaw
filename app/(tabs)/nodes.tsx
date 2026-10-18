import Text from '@/components/AppText';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import { colors, gradients, radius, shadow } from '@/constants/theme';
import { useLake, type Device } from '@/context/LakeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

type IconName = keyof typeof Ionicons.glyphMap;

/** Loop 0 -> 1 forever, after an optional starting delay. */
function useLoop(duration: number, delay = 0, active = true) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      v.stopAnimation();
      v.setValue(0);
      return;
    }
    v.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })),
    ]);
    anim.start();
    return () => anim.stop();
  }, [active, duration, delay, v]);
  return v;
}

/* ---------------- Scanner ---------------- */
const SCAN = 232;
const BLIPS = [
  { x: 0.72, y: 0.26 },
  { x: 0.2, y: 0.38 },
  { x: 0.3, y: 0.76 },
  { x: 0.8, y: 0.66 },
  { x: 0.56, y: 0.12 },
];
const CHANNELS = ['915.0 MHz', '915.2 MHz', '915.4 MHz'];

function Ping({ delay }: { delay: number }) {
  const v = useLoop(3000, delay);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: SCAN,
        height: SCAN,
        borderRadius: SCAN / 2,
        borderWidth: 1.5,
        borderColor: colors.sky,
        opacity: v.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.55, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
      }}
    />
  );
}

function Blip({ x, y, paired }: { x: number; y: number; paired: boolean }) {
  const v = useLoop(1600, Math.round(x * 900), !paired);
  return (
    <View
      style={{
        position: 'absolute',
        left: x * SCAN - 6,
        top: y * SCAN - 6,
        width: 12,
        height: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!paired && (
        <Animated.View
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: colors.amber,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }) }],
          }}
        />
      )}
      <View
        style={{
          width: 9,
          height: 9,
          borderRadius: 5,
          backgroundColor: paired ? colors.sky : colors.amber,
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.9)',
        }}
      />
    </View>
  );
}

function Scanner({ devices }: { devices: Device[] }) {
  const sweep = useLoop(3400);
  const rotate = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const [channel, setChannel] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setChannel((c) => (c + 1) % 3), 1100);
    return () => clearInterval(id);
  }, []);
  const nearby = devices.filter((d) => d.state !== 'connected').length;

  return (
    <LinearGradient colors={['#0F3556', '#061A2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.scanCard}>
      <View style={s.scanArea}>
        {[0.36, 0.68, 1].map((f) => (
          <View
            key={f}
            style={{
              position: 'absolute',
              width: SCAN * f,
              height: SCAN * f,
              borderRadius: (SCAN * f) / 2,
              borderWidth: 1,
              borderColor: 'rgba(60,200,240,0.22)',
            }}
          />
        ))}
        {[0, 1000, 2000].map((d) => (
          <Ping key={d} delay={d} />
        ))}

        <Animated.View style={{ position: 'absolute', width: SCAN, height: SCAN, transform: [{ rotate }] }}>
          <Svg width={SCAN} height={SCAN} viewBox="0 0 232 232">
            <Defs>
              <SvgGradient id="sweep" gradientUnits="userSpaceOnUse" x1="116" y1="0" x2="215" y2="0">
                <Stop offset="0" stopColor="#3CC8F0" stopOpacity="0" />
                <Stop offset="1" stopColor="#3CC8F0" stopOpacity="0.5" />
              </SvgGradient>
            </Defs>
            <Path d="M116 116 L116 2 A114 114 0 0 1 214.7 59 Z" fill="url(#sweep)" />
            <Line x1={116} y1={116} x2={214.7} y2={59} stroke="#7FE3FF" strokeWidth={1.5} />
          </Svg>
        </Animated.View>

        {devices.map((d, i) => (
          <Blip key={d.id} x={BLIPS[i % BLIPS.length].x} y={BLIPS[i % BLIPS.length].y} paired={d.state === 'connected'} />
        ))}

        <LinearGradient colors={gradients.brand} style={s.scanCenter}>
          <Ionicons name="radio" size={26} color="#fff" />
        </LinearGradient>
      </View>

      <Text variant="heading" style={{ color: '#fff', marginTop: 14 }}>
        Scanning for LoRa Nodes
      </Text>
      <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
        {nearby} new {nearby === 1 ? 'device' : 'devices'} in range
      </Text>

      <View style={s.channelRow}>
        {CHANNELS.map((c, i) => (
          <View key={c} style={[s.channel, i === channel && s.channelOn]}>
            <View style={[s.channelDot, i === channel && { backgroundColor: colors.sky }]} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: i === channel ? '#fff' : 'rgba(255,255,255,0.55)' }}>
              {c}
            </Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

/* ---------------- Device rows ---------------- */
const ROLE = {
  Gateway: { icon: 'radio' as IconName, c: ['#7B5CFA', '#A78BFA'] as const, pill: colors.violetBg, ink: '#5B3FD6' },
  Relay: { icon: 'swap-horizontal' as IconName, c: ['#1677E5', '#3CC8F0'] as const, pill: colors.oceanBg, ink: colors.ocean },
  Sensor: { icon: 'thermometer' as IconName, c: ['#12B177', '#3CD6A0'] as const, pill: colors.greenBg, ink: colors.greenInk },
};
const NEW_DEVICE = { icon: 'hardware-chip' as IconName, c: ['#F5A524', '#FFC76B'] as const };

function Signal({ rssi }: { rssi: number }) {
  const bars = rssi > -65 ? 4 : rssi > -80 ? 3 : rssi > -90 ? 2 : 1;
  return (
    <View style={s.signal}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: 5 + i * 4,
            borderRadius: 2,
            backgroundColor: i <= bars ? colors.green : '#DCE3EE',
          }}
        />
      ))}
    </View>
  );
}

function Row({ d, onAdd }: { d: Device; onAdd?: () => void }) {
  const parts = d.sub.split(' · ');
  const connected = d.state === 'connected';
  const role = connected ? ROLE[parts[0] as keyof typeof ROLE] ?? ROLE.Sensor : null;
  const pct = connected ? parseInt(parts[1] ?? '100', 10) : 0;
  const batIcon: IconName = pct > 75 ? 'battery-full' : pct > 40 ? 'battery-half' : 'battery-dead';
  const batColor = pct > 40 ? colors.green : colors.amber;
  const tile = role ?? NEW_DEVICE;

  return (
    <View style={s.row}>
      <View>
        <LinearGradient colors={tile.c} style={s.rowIcon}>
          <Ionicons name={tile.icon} size={21} color="#fff" />
        </LinearGradient>
        {connected && <View style={s.onlineDot} />}
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="heading" style={{ fontSize: 15.5, lineHeight: 21 }}>{d.name}</Text>
        <View style={s.metaRow}>
          {connected && role ? (
            <>
              <View style={[s.pill, { backgroundColor: role.pill }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: role.ink }}>{parts[0]}</Text>
              </View>
              <Ionicons name={batIcon} size={16} color={batColor} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>{pct}%</Text>
            </>
          ) : (
            <>
              <View style={[s.pill, { backgroundColor: '#EEF2F8' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>{parts[0]}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>{d.rssi} dBm</Text>
            </>
          )}
        </View>
      </View>

      <Signal rssi={d.rssi} />

      {d.state === 'unpaired' && (
        <Pressable onPress={onAdd}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.addBtn}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add</Text>
          </LinearGradient>
        </Pressable>
      )}
      {d.state === 'pairing' && (
        <View style={[s.addBtn, { backgroundColor: colors.oceanBg }]}>
          <ActivityIndicator size="small" color={colors.ocean} />
          <Text style={{ color: colors.ocean, fontWeight: '700', fontSize: 13 }}>Pairing</Text>
        </View>
      )}
    </View>
  );
}

/* ---------------- Topology ---------------- */
const TOPO_H = 222;
const NODE_POS = {
  N01: { x: 0.5, y: 0.2 },
  N02: { x: 0.16, y: 0.68 },
  N03: { x: 0.84, y: 0.68 },
} as const;
const NODE_ROLE = { N01: 'Gateway', N02: 'Relay', N03: 'Sensor' } as const;
type NodeKey = keyof typeof NODE_POS;
const LINKS: [NodeKey, NodeKey][] = [
  ['N01', 'N02'],
  ['N01', 'N03'],
  ['N02', 'N03'],
];

function Packet({ a, b, delay, color }: { a: { x: number; y: number }; b: { x: number; y: number }; delay: number; color: string }) {
  const v = useLoop(2200, delay);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -4,
        top: -4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [a.x, b.x] }) },
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [a.y, b.y] }) },
        ],
      }}
    />
  );
}

function GatewayRing({ size }: { size: number }) {
  const v = useLoop(2000);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.violet,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
      }}
    />
  );
}

function Topology() {
  const [w, setW] = useState(0);
  const P = (k: NodeKey) => ({ x: NODE_POS[k].x * w, y: NODE_POS[k].y * TOPO_H });

  return (
    <View style={{ height: TOPO_H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <>
          <Svg width={w} height={TOPO_H} style={StyleSheet.absoluteFill}>
            {LINKS.map(([a, b]) => (
              <Line
                key={a + b}
                x1={P(a).x}
                y1={P(a).y}
                x2={P(b).x}
                y2={P(b).y}
                stroke="#CFE3F7"
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
          </Svg>

          {LINKS.map(([a, b], i) => (
            <View key={`${w}-${a}${b}`} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Packet a={P(a)} b={P(b)} delay={i * 500} color={colors.ocean} />
              <Packet a={P(b)} b={P(a)} delay={i * 500 + 1100} color={colors.sky} />
            </View>
          ))}

          {(Object.keys(NODE_POS) as NodeKey[]).map((k) => {
            const p = P(k);
            const big = k === 'N01';
            const size = big ? 62 : 52;
            return (
              <View key={k} style={{ position: 'absolute', left: p.x - size / 2, top: p.y - size / 2, alignItems: 'center' }}>
                <View style={{ width: size, height: size }}>
                  {big && <GatewayRing size={size} />}
                  <LinearGradient
                    colors={big ? (['#7B5CFA', '#A78BFA'] as const) : gradients.brand}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: '#fff',
                      ...shadow(big ? colors.violet : colors.ocean, 2),
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{k}</Text>
                  </LinearGradient>
                </View>
                <Text variant="caption" style={{ marginTop: 6, fontWeight: '600' }}>{NODE_ROLE[k]}</Text>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

function Stat({ icon, color, bg, value, label }: { icon: IconName; color: string; bg: string; value: string; label: string }) {
  return (
    <View style={s.stat}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 8 }}>{value}</Text>
      <Text variant="caption" style={{ fontSize: 11.5 }}>{label}</Text>
    </View>
  );
}

/* ---------------- Screen ---------------- */
export default function Nodes() {
  const { devices, pairDevice, meshCount } = useLake();
  const [filter, setFilter] = useState<'all' | 'connected' | 'unpaired'>('all');

  const unpaired = devices.filter((d) => d.state !== 'connected');
  const connected = devices.filter((d) => d.state === 'connected');
  const counts = { all: devices.length, connected: connected.length, unpaired: unpaired.length };
  const labels = { all: 'All', connected: 'Connected', unpaired: 'Unpaired' };

  return (
    <Screen title="Swarm Setup" status="Gateway online, scanning 915 MHz">
      <Scanner devices={devices} />

      <View style={s.chips}>
        {(['all', 'connected', 'unpaired'] as const).map((f) => {
          const on = filter === f;
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, on && s.chipActive]}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: on ? '#fff' : colors.text }}>{labels[f]}</Text>
              <View style={[s.count, on && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: on ? '#fff' : colors.muted }}>{counts[f]}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {filter !== 'connected' && (
        <Card>
          <View style={s.sectionTop}>
            <Text variant="title" style={{ fontSize: 19 }}>Unpaired Devices</Text>
            <View style={[s.pill, { backgroundColor: colors.amberBg }]}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.amberInk }}>{unpaired.length} found</Text>
            </View>
          </View>
          {unpaired.length === 0 ? (
            <Text variant="caption" style={{ paddingVertical: 12 }}>All nearby devices are paired.</Text>
          ) : (
            unpaired.map((d) => <Row key={d.id} d={d} onAdd={() => pairDevice(d.id)} />)
          )}
        </Card>
      )}

      {filter !== 'unpaired' && (
        <Card>
          <View style={s.sectionTop}>
            <Text variant="title" style={{ fontSize: 19 }}>Connected Devices</Text>
            <View style={[s.pill, { backgroundColor: colors.greenBg }]}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.greenInk }}>{connected.length} online</Text>
            </View>
          </View>
          {connected.map((d) => (
            <Row key={d.id} d={d} />
          ))}
        </Card>
      )}

      <Card>
        <View style={s.sectionTop}>
          <View>
            <Text variant="title" style={{ fontSize: 19 }}>Network Topology</Text>
            <Text variant="caption">Live data hopping between nodes</Text>
          </View>
          <View style={[s.pill, { backgroundColor: colors.greenBg }]}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.greenInk }}>Healthy</Text>
          </View>
        </View>

        <Topology />

        <View style={s.stats}>
          <Stat icon="git-network" color={colors.ocean} bg={colors.oceanBg} value={String(meshCount)} label="Active Nodes" />
          <Stat icon="sync" color={colors.violet} bg={colors.violetBg} value="2.4s" label="Sync Age" />
          <Stat icon="pulse" color={colors.green} bg={colors.greenBg} value="99.2%" label="Uptime" />
        </View>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  scanCard: { borderRadius: 28, paddingVertical: 22, paddingHorizontal: 16, alignItems: 'center' },
  scanArea: { width: SCAN, height: SCAN, alignItems: 'center', justifyContent: 'center' },
  scanCenter: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', ...shadow(colors.sky, 3) },
  channelRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  channelOn: { backgroundColor: 'rgba(60,200,240,0.2)' },
  channelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },

  chips: { flexDirection: 'row', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.ocean, borderColor: colors.ocean, ...shadow(colors.ocean, 1) },
  count: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F8', paddingHorizontal: 6 },

  sectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.green,
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  signal: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 21 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 13 },

  stats: { flexDirection: 'row', gap: 10, marginTop: 8 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: '#F4F7FB', borderRadius: 16, paddingVertical: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});