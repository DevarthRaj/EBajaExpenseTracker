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
