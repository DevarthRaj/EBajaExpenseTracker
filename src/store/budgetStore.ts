// ============================================================
// Budget Store — Zustand
// Manages the list of budgets and the active budget
// ============================================================
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Budget } from '../lib/supabaseTypes';

interface BudgetState {
  budgets: Budget[];
  activeBudget: Budget | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchBudgets: () => Promise<void>;
  setActiveBudget: (budget: Budget) => void;
  createBudget: (name: string, limitAmount: number) => Promise<void>;
  archiveBudget: (id: string) => Promise<void>;
  unarchiveBudget: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  activeBudget: null,
  loading: false,
  error: null,

  fetchBudgets: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchBudgets error:', JSON.stringify(error));
      set({ loading: false, error: error.message });
      return;
    }

    const budgets = data as Budget[];
    const current = get().activeBudget;

    // Default: pick the first non-archived budget, or keep current
    let activeBudget = current;
    if (!activeBudget || !budgets.find((b) => b.id === activeBudget!.id)) {
      activeBudget = budgets.find((b) => !b.is_archived) ?? budgets[0] ?? null;
    }

    set({ budgets, activeBudget, loading: false });
  },

  setActiveBudget: (budget: Budget) => {
    set({ activeBudget: budget });
  },

  createBudget: async (name: string, limitAmount: number) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('budgets')
      .insert({ name, limit_amount: limitAmount })
      .select()
      .single();

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    const newBudget = data as Budget;
    set((state) => ({
      budgets: [newBudget, ...state.budgets],
      activeBudget: newBudget,
      loading: false,
    }));
  },

  archiveBudget: async (id: string) => {
    const { error } = await supabase
      .from('budgets')
      .update({ is_archived: true })
      .eq('id', id);

    if (!error) {
      set((state) => ({
        budgets: state.budgets.map((b) =>
          b.id === id ? { ...b, is_archived: true } : b
        ),
        // Switch active budget if we archived the current one
        activeBudget:
          state.activeBudget?.id === id
            ? state.budgets.find((b) => !b.is_archived && b.id !== id) ?? null
            : state.activeBudget,
      }));
    }
  },

  unarchiveBudget: async (id: string) => {
    const { error } = await supabase
      .from('budgets')
      .update({ is_archived: false })
      .eq('id', id);

    if (!error) {
      set((state) => ({
        budgets: state.budgets.map((b) =>
          b.id === id ? { ...b, is_archived: false } : b
        ),
      }));
    }
  },
}));
