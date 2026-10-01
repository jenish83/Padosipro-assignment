// Design tokens. Brand green (#155C49) is taken from the PadosiPro web app's theme colour.
export const colors = {
  primary: '#155C49',
  primaryDark: '#0E4536',
  primaryTint: '#E7F1EC',
  background: '#F6F8F7',
  surface: '#FFFFFF',
  text: '#14261F',
  textMuted: '#64766E',
  border: '#DCE5E0',
  error: '#C0392B',
  errorTint: '#FBEDEB',
  success: '#1E8E5A',
  successTint: '#E6F5EC',
  disabled: '#A9BDB5',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const font = { h1: 26, h2: 20, body: 16, small: 13 };

export const shadow = {
  shadowColor: '#0E2B22',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const TAGLINE = "You don't manage tasks — we do.";

const CATEGORY_ICONS: Record<string, string> = {
  'Home Services': '🏠',
  'Errands & Daily Tasks': '🛍️',
  'Travel & Tourism': '✈️',
  'Health & Medical': '🩺',
  'Events & Management': '🎉',
};
export const categoryIcon = (category: string) => CATEGORY_ICONS[category] ?? '⭐';
