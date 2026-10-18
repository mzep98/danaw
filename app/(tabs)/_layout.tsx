import { colors } from '@/constants/theme';
import { LakeProvider } from '@/context/LakeContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (name: string, title: string, off: IconName, on: IconName) => (
  <Tabs.Screen
    name={name}
    options={{
      title,
      tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? on : off} size={24} color={color} />,
    }}
  />
);

export default function TabLayout() {
  return (
    <LakeProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.ocean,
          tabBarInactiveTintColor: '#8A99B0',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 0,
            shadowColor: colors.navy,
            shadowOpacity: 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 12,
          },
          tabBarLabelStyle: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
        }}
      >
        {tab('index', 'Dash', 'speedometer-outline', 'speedometer')}
        {tab('nodes', 'Nodes', 'git-network-outline', 'git-network')}
        {tab('map', 'Map', 'map-outline', 'map')}
        {tab('forecast', 'Forecast', 'trending-up-outline', 'trending-up')}
        {tab('vision', 'Vision', 'eye-outline', 'eye')}
      </Tabs>
    </LakeProvider>
  );
}