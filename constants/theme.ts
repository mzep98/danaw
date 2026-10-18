export const colors = {
  // brand (pulled from the DANAW logo: ocean blue -> coral)
  navy: '#0B2A45',
  navyDeep: '#061A2E',
  ocean: '#1677E5',
  oceanBg: '#E3F0FF',
  sky: '#3CC8F0',
  coral: '#F0534A',
  coralBg: '#FFE7E4',
  violet: '#7B5CFA',
  violetBg: '#ECE7FF',
  green: '#12B177',
  greenBg: '#DAF6EA',
  greenInk: '#0B7A52',
  amber: '#F5A524',
  amberBg: '#FFF0D0',
  amberInk: '#9A5B00',

  // surfaces and text
  bg: '#F1F5FB',
  card: '#FFFFFF',
  text: '#0A1A2F',
  muted: '#566680',
  border: '#E2E9F3',
  white: '#FFFFFF',
};

export const gradients = {
  brand: ['#1677E5', '#3CC8F0'],
  sunset: ['#1677E5', '#F0534A'],
  deep: ['#0B2A45', '#124F86'],
  alert: ['#FF6A5C', '#C73A3A'],
  safe: ['#12B177', '#3CD6A0'],
} as const;

export const radius = { card: 22, inner: 14, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

/** Colored, layered shadow. Use instead of the flat grey one. */
export const shadow = (color: string = colors.navy, strength: 1 | 2 | 3 = 1) => ({
  shadowColor: color,
  shadowOpacity: 0.06 + strength * 0.05,
  shadowRadius: 8 + strength * 6,
  shadowOffset: { width: 0, height: 3 + strength * 2 },
  elevation: strength * 2,
});