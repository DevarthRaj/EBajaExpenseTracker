// ============================================================
// Expense Store — Zustand
// Manages expenses, funds, and all write operations
// ============================================================
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  Expense,
  Fund,
  ExpenseSplit,
  ExpenseEdit,
  Template,
  ExpenseFormData,
  FundFormData,
} from '../lib/supabaseTypes';

interface ExpenseState {
  expenses: Expense[];
  funds: Fund[];
  templates: Template[];
  loading: boolean;
  error: string | null;

  // Fetch
  fetchExpenses: (budgetId: string) => Promise<void>;
  fetchFunds: (budgetId: string) => Promise<void>;
  fetchTemplates: () => Promise<void>;

  // Expenses
  addExpense: (
    budgetId: string,
    form: ExpenseFormData,
    billUri: string | null
  ) => Promise<void>;
  updateExpense: (
    id: string,
    form: ExpenseFormData,
    billUri: string | null
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  markReimbursed: (id: string) => Promise<void>;
  getExpenseEdits: (expenseId: string) => Promise<ExpenseEdit[]>;
  getExpenseSplits: (expenseId: string) => Promise<ExpenseSplit[]>;

  // Funds
  addFund: (budgetId: string, form: FundFormData) => Promise<void>;
  deleteFund: (id: string) => Promise<void>;

  // Templates
  saveTemplate: (name: string, payload: Partial<ExpenseFormData>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  clearError: () => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  funds: [],
  templates: [],
  loading: false,
  error: null,

  // ── FETCH ───────────────────────────────────────────────

  fetchExpenses: async (budgetId: string) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('budget_id', budgetId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({ expenses: data as Expense[], loading: false });
  },

  fetchFunds: async (budgetId: string) => {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('budget_id', budgetId)
      .order('date', { ascending: false });

    if (!error) {
      set({ funds: data as Fund[] });
    }
  },

  fetchTemplates: async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      set({ templates: data as Template[] });
    }
  },

  // ── EXPENSE WRITE OPS ───────────────────────────────────

  addExpense: async (budgetId, form, billUri) => {
    set({ loading: true, error: null });

    let bill_url: string | null = null;

    // Upload bill image if provided
    if (billUri) {
      bill_url = await uploadBill(billUri);
    }

    const amount = parseFloat(form.amount);
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        budget_id: budgetId,
        amount,
        date: form.date,
        paid_by: form.paid_by,
        description: form.description,
        department: form.department,
        category: form.category,
        payment_mode: form.payment_mode,
        notes: form.notes || null,
        bill_url,
        is_reimbursement_pending: form.is_reimbursement_pending,
        is_split: form.is_split,
        split_mode: form.is_split ? form.split_mode : null,
      })
      .select()
      .single();

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    const newExpense = data as Expense;

    // Insert splits if applicable
    if (form.is_split && form.splits.length > 0) {
      const splitRows = form.splits.map((s) => ({
        expense_id: newExpense.id,
        split_type: form.split_mode,
        department: form.split_mode === 'department' ? s.key : null,
        member_name: form.split_mode === 'member' ? s.key : null,
        people_count:
          form.split_mode === 'equal' ? parseInt(s.people_count ?? '1') : null,
        amount: parseFloat(s.amount),
      }));

      await supabase.from('expense_splits').insert(splitRows);
    }

    set((state) => ({
      expenses: [newExpense, ...state.expenses],
      loading: false,
    }));
  },

  updateExpense: async (id, form, billUri) => {
    set({ loading: true, error: null });

    let bill_url: string | undefined = undefined;

    if (billUri && billUri.startsWith('file://')) {
      bill_url = await uploadBill(billUri);
    }

    const updatePayload: Record<string, unknown> = {
      amount: parseFloat(form.amount),
      date: form.date,
      paid_by: form.paid_by,
      description: form.description,
      department: form.department,
      category: form.category,
      payment_mode: form.payment_mode,
      notes: form.notes || null,
      is_reimbursement_pending: form.is_reimbursement_pending,
      is_split: form.is_split,
      split_mode: form.is_split ? form.split_mode : null,
    };

    if (bill_url !== undefined) {
      updatePayload.bill_url = bill_url;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    // Replace splits
    if (form.is_split) {
      await supabase.from('expense_splits').delete().eq('expense_id', id);
      const splitRows = form.splits.map((s) => ({
        expense_id: id,
        split_type: form.split_mode,
        department: form.split_mode === 'department' ? s.key : null,
        member_name: form.split_mode === 'member' ? s.key : null,
        people_count:
          form.split_mode === 'equal' ? parseInt(s.people_count ?? '1') : null,
        amount: parseFloat(s.amount),
      }));
      if (splitRows.length > 0) {
        await supabase.from('expense_splits').insert(splitRows);
      }
    }

    const updated = data as Expense;
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? updated : e)),
      loading: false,
    }));
  },

  deleteExpense: async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
      }));
    }
  },

  markReimbursed: async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .update({ is_reimbursed: true, is_reimbursement_pending: false })
      .eq('id', id);

    if (!error) {
      set((state) => ({
        expenses: state.expenses.map((e) =>
          e.id === id
            ? { ...e, is_reimbursed: true, is_reimbursement_pending: false }
            : e
        ),
      }));
    }
  },

  getExpenseEdits: async (expenseId: string): Promise<ExpenseEdit[]> => {
    const { data } = await supabase
      .from('expense_edits')
      .select('*')
      .eq('expense_id', expenseId)
      .order('edited_at', { ascending: false });

    return (data as ExpenseEdit[]) ?? [];
  },

  getExpenseSplits: async (expenseId: string): Promise<ExpenseSplit[]> => {
    const { data } = await supabase
      .from('expense_splits')
      .select('*')
      .eq('expense_id', expenseId);

    return (data as ExpenseSplit[]) ?? [];
  },

  // ── FUND WRITE OPS ──────────────────────────────────────

  addFund: async (budgetId: string, form: FundFormData) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('funds')
      .insert({
        budget_id: budgetId,
        contributor_name: form.contributor_name,
        amount: parseFloat(form.amount),
        date: form.date,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    set((state) => ({
      funds: [data as Fund, ...state.funds],
      loading: false,
    }));
  },

  deleteFund: async (id: string) => {
    const { error } = await supabase.from('funds').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        funds: state.funds.filter((f) => f.id !== id),
      }));
    }
  },

  // ── TEMPLATES ───────────────────────────────────────────

  saveTemplate: async (name: string, payload: Partial<ExpenseFormData>) => {
    const { data, error } = await supabase
      .from('templates')
      .insert({ name, payload })
      .select()
      .single();

    if (!error) {
      set((state) => ({
        templates: [data as Template, ...state.templates],
      }));
    }
  },

  deleteTemplate: async (id: string) => {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
      }));
    }
  },

  clearError: () => set({ error: null }),
}));

// ─── Helper: Upload bill image to Supabase Storage ────────────
async function uploadBill(uri: string): Promise<string | null> {
  try {
    const fileName = `bill_${Date.now()}.jpg`;
    const response = await fetch(uri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('bills')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error || !data) return null;

    const { data: urlData } = supabase.storage
      .from('bills')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch {
    return null;
  }
}
