// ============================================================
// App-wide constants: departments, categories, payment modes
// ============================================================

export const DEPARTMENTS = [
  'Powertrain',
  'Suspension',
  'Chassis',
  'Steering',
  'Brake',
  'General',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_COLORS: Record<Department, string> = {
  Powertrain: '#EF4444',
  Suspension: '#F97316',
  Chassis:    '#EAB308',
  Steering:   '#22C55E',
  Brake:      '#3B82F6',
  General:    '#A855F7',
};

export const CATEGORIES = [
  'Materials',
  'Tools',
  'Travel',
  'Entry Fees',
  'Food',
  'Accommodation',
  'Miscellaneous',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Online'] as const;

export const SPLIT_MODES = [
  { value: 'department', label: 'By Department' },
  { value: 'member',     label: 'By Member' },
  { value: 'equal',      label: 'Equal Split (N people)' },
] as const;

// ─── Design System Tokens (Extracted from Google Stitch) ───
export const THEME = {
  colors: {
    electricBlue: '#1649E0',
    vibrantGreen: '#16E04C',
    deepBg: '#000a46',
    glassBg: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassAccent: 'rgba(22, 224, 76, 0.08)',
    textWhite: '#FFFFFF',
    textMuted: 'rgba(255, 255, 255, 0.4)',
    textBlueLight: '#90cdf4',
    textRed: '#f87171',
    blackOverlay: 'rgba(0, 0, 0, 0.2)',
  },
  // Reusable card shadow and glass styling properties for React Native
  styles: {
    glassCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      padding: 16,
    },
    electricGlow: {
      shadowColor: '#16E04C',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    screenContainer: {
      flex: 1,
      backgroundColor: '#000a46',
    },
  }
};

