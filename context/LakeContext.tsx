import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type Device = {
  id: string;
  name: string;
  sub: string;
  rssi: number;
  state: 'unpaired' | 'pairing' | 'connected';
};

export type LayerKey = 'surface' | 'mid' | 'bottom';

export const LAYERS: { key: LayerKey; label: string; depth: number }[] = [
  { key: 'surface', label: 'Surface', depth: 0.5 },
  { key: 'mid', label: 'Mid-water', depth: 4.0 },
  { key: 'bottom', label: 'Bottom', depth: 8.0 },
];

const INITIAL_DEVICES: Device[] = [
  { id: '01', name: 'Node-01', sub: 'Gateway · 100%', rssi: -40, state: 'connected' },
  { id: '02', name: 'Node-02', sub: 'Relay · 98%', rssi: -52, state: 'connected' },
  { id: '03', name: 'Node-03', sub: 'Sensor · 91%', rssi: -61, state: 'connected' },
  { id: '06', name: 'Node-06', sub: 'SX1262 · -74 dBm', rssi: -74, state: 'unpaired' },
  { id: '07', name: 'Node-07', sub: 'SX1262 · -88 dBm', rssi: -88, state: 'unpaired' },
];

type Actuator = 'a1' | 'pump';
type LayerReading = { temp: number; doLevel: number };

type LakeCtx = {
  devices: Device[];
  pairDevice: (id: string) => void;
  meshCount: number;
  aerators: Record<Actuator, boolean>;
  toggleActuator: (key: Actuator) => void;
  setAerators: (on: boolean) => void;
  aerationActive: boolean;
  readings: { doLevel: number; temp: number; risk: number };
  layers: Record<LayerKey, LayerReading>;
  layer: LayerKey;
  setLayer: (l: LayerKey) => void;
  syncAge: number;
};

const Ctx = createContext<LakeCtx | null>(null);

export function LakeProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [aerators, setAeratorState] = useState<Record<Actuator, boolean>>({ a1: false, pump: false });
  const [doLevel, setDo] = useState(6.2);
  const [temp, setTemp] = useState(27.4);
  const [syncAge, setSyncAge] = useState(8);
  const [layer, setLayer] = useState<LayerKey>('mid');

  const aerationActive = aerators.a1 || aerators.pump;
  const boost = (aerators.a1 ? 0.6 : 0) + (aerators.pump ? 0.6 : 0);

  useEffect(() => {
    const id = setInterval(() => setSyncAge((a) => (a >= 12 ? 1 : a + 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const target = 6.2 + boost;
    const id = setInterval(() => {
      setDo((v) => Math.round((v + (target - v) * 0.25 + (Math.random() - 0.5) * 0.06) * 100) / 100);
      setTemp((t) => Math.round((t + (27.4 - t) * 0.2 + (Math.random() - 0.5) * 0.08) * 100) / 100);
    }, 2000);
    return () => clearInterval(id);
  }, [boost]);

  const pairDevice = (id: string) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, state: 'pairing' } : d)));
    setTimeout(() => {
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, state: 'connected', sub: 'Sensor · 100%' } : d))
      );
    }, 1500);
  };

  const toggleActuator = (key: Actuator) => setAeratorState((p) => ({ ...p, [key]: !p[key] }));
  const setAerators = (on: boolean) => setAeratorState({ a1: on, pump: on });

  const meshCount = 12 + devices.filter((d) => d.state === 'connected').length;
  const risk = Math.min(60, Math.max(5, Math.round(18 - (doLevel - 6.2) * 10)));

  const layers: Record<LayerKey, LayerReading> = {
    surface: { temp, doLevel: doLevel + 0.9 },
    mid: { temp: temp - 1.6, doLevel },
    bottom: { temp: temp - 2.8, doLevel: Math.max(0.5, doLevel - 2.4) },
  };

  return (
    <Ctx.Provider
      value={{
        devices,
        pairDevice,
        meshCount,
        aerators,
        toggleActuator,
        setAerators,
        aerationActive,
        readings: { doLevel, temp, risk },
        layers,
        layer,
        setLayer,
        syncAge,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLake() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLake must be used inside LakeProvider');
  return v;
}