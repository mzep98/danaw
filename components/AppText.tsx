import { colors } from '@/constants/theme';
import { Text as RNText, StyleSheet, TextProps, TextStyle } from 'react-native';

const FAMILY: Record<string, string> = {
  '400': 'Poppins_400Regular',
  '500': 'Poppins_500Medium',
  '600': 'Poppins_600SemiBold',
  '700': 'Poppins_700Bold',
  '800': 'Poppins_800ExtraBold',
};

/**
 * One type scale for the whole app.
 * Titles and labels use Title Case; descriptive text uses sentence case.
 */
export const VARIANTS = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8, color: colors.text },
  title: { fontSize: 22, lineHeight: 29, fontWeight: '700', letterSpacing: -0.3, color: colors.text },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400', color: colors.text },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.text },
  caption: { fontSize: 12.5, lineHeight: 18, fontWeight: '500', color: colors.muted },
  metric: { fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1, color: colors.text },
} satisfies Record<string, TextStyle>;

export type Variant = keyof typeof VARIANTS;

type Props = TextProps & { variant?: Variant };

export default function Text({ style, variant, ...rest }: Props) {
  const flat = StyleSheet.flatten([variant ? VARIANTS[variant] : null, style]) ?? {};
  const raw = String(flat.fontWeight ?? '400');
  const key =
    raw === 'bold'
      ? '700'
      : raw === 'normal' || raw === '300' || raw === '100' || raw === '200'
      ? '400'
      : raw === '900'
      ? '800'
      : raw;
  const family = FAMILY[key] ?? FAMILY['400'];
  return <RNText {...rest} style={[flat, { fontFamily: family, fontWeight: 'normal' }]} />;
}