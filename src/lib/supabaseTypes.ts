// ============================================================
// Supabase Database Type Definitions
// ============================================================

export type UserRole = 'admin' | 'viewer';
export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Online';
export type SplitMode = 'department' | 'member' | 'equal';

export interface DbUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Budget {
  id: string;
  name: string;
  limit_amount: number;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Fund {
  id: string;
  budget_id: string;
  contributor_name: string;
  amount: number;
  date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  budget_id: string;
  amount: number;
  date: string;
  paid_by: string;
  description: string;
  department: string;
  category: string;
  payment_mode: PaymentMode;
  notes: string | null;
  bill_url: string | null;
  is_reimbursement_pending: boolean;
  is_reimbursed: boolean;
  is_split: boolean;
  split_mode: SplitMode | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  split_type: SplitMode;
  department: string | null;
  member_name: string | null;
  people_count: number | null;
  amount: number;
}

export interface DepartmentLimit {
  id: string;
  budget_id: string;
  department: string;
  limit_amount: number;
}

export interface Template {
  id: string;
  name: string;
  payload: Partial<ExpenseFormData>;
  created_by: string | null;
  created_at: string;
}

export interface ExpenseEdit {
  id: string;
  expense_id: string;
  edited_by: string | null;
  edited_at: string;
  previous_data: Expense;
}

// ─── Form Shapes ─────────────────────────────────────────────

export interface ExpenseFormData {
  amount: string;
  date: string;
  paid_by: string;
  description: string;
  department: string;
  category: string;
  payment_mode: PaymentMode;
  notes: string;
  bill_uri: string | null;
  is_reimbursement_pending: boolean;
  is_split: boolean;
  split_mode: SplitMode;
  splits: SplitEntry[];
}

export interface SplitEntry {
  key: string;           // department name | member name | 'equal'
  label: string;
  amount: string;
  people_count?: string; // for 'equal' mode
}

export interface FundFormData {
  contributor_name: string;
  amount: string;
  date: string;
  notes: string;
}
