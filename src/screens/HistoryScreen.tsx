// ============================================================
// History Screen — Archived budgets (editable with audit trail)
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { Budget } from '../lib/supabaseTypes';
import { formatDate } from '../utils/formatters';
import { supabase } from '../lib/supabase';

interface BudgetStats {
  expense_count: number;
  total_spent: number;
  total_funds: number;
}

export default function HistoryScreen() {
  const { budgets, fetchBudgets, unarchiveBudget, setActiveBudget } = useBudgetStore();
  const { role } = useAuthStore();
  const navigation = useNavigation<any>();
  const isAdmin = role === 'admin';
  const [refreshing, setRefreshing] = useState(false);
  const [statsMap, setStatsMap] = useState<Record<string, BudgetStats>>({});

  const archived = budgets.filter((b) => b.is_archived);

  useEffect(() => {
    if (archived.length > 0) fetchStats(archived);
  }, [budgets]);

  const fetchStats = async (archivedBudgets: Budget[]) => {
    const map: Record<string, BudgetStats> = {};
    for (const b of archivedBudgets) {
      const [{ data: expenses }, { data: funds }] = await Promise.all([
        supabase.from('expenses').select('amount').eq('budget_id', b.id),
        supabase.from('funds').select('amount').eq('budget_id', b.id),
      ]);
      map[b.id] = {
        expense_count: expenses?.length ?? 0,
        total_spent: (expenses ?? []).reduce((s: number, e: any) => s + e.amount, 0),
        total_funds: (funds ?? []).reduce((s: number, f: any) => s + f.amount, 0),
      };
    }
    setStatsMap(map);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBudgets();
    setRefreshing(false);
  };

  const handleUnarchive = (budget: Budget) => {
    Alert.alert('Reactivate Budget', `Reactivate "${budget.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reactivate', onPress: () => unarchiveBudget(budget.id) },
    ]);
  };

  // Navigate to the budget's log — switch active budget temporarily
  const handleViewOrEdit = (budget: Budget) => {
    setActiveBudget(budget);
    // Navigate to Log tab — the log will show this budget's data
    navigation.navigate('Log');
  };

  const renderBudget = ({ item }: { item: Budget }) => {
    const stats = statsMap[item.id];
    return (
      <View style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetName}>{item.name}</Text>
          <View style={styles.archivedBadge}>
            <Text style={styles.archivedText}>Archived</Text>
          </View>
        </View>
        {item.year && <Text style={styles.budgetYear}>Year: {item.year}</Text>}
        <Text style={styles.budgetDate}>Created: {formatDate(item.created_at)}</Text>

        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{stats.expense_count}</Text>
              <Text style={styles.statLbl}>Expenses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>₹{stats.total_spent.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLbl}>Total Spent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>₹{stats.total_funds.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLbl}>Total Funds</Text>
            </View>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.viewBtn} onPress={() => handleViewOrEdit(item)}>
            <Text style={styles.viewBtnText}>View / Edit Log</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={styles.unarchiveBtn} onPress={() => handleUnarchive(item)}>
              <Text style={styles.unarchiveBtnText}>Reactivate</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={archived}
        keyExtractor={(b) => b.id}
        renderItem={renderBudget}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No archived budgets.</Text>
            <Text style={styles.emptyHint}>Archive a budget from the Budgets tab.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  budgetCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budgetName: { fontSize: 17, fontWeight: '700', flex: 1 },
  archivedBadge: { backgroundColor: '#fef3c7', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  archivedText: { fontSize: 11, color: '#92400e', fontWeight: '600' },
  budgetYear: { fontSize: 13, color: '#888', marginTop: 4 },
  budgetDate: { fontSize: 12, color: '#aaa', marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: 12, gap: 4 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 8 },
  statVal: { fontSize: 13, fontWeight: '700' },
  statLbl: { fontSize: 10, color: '#888', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  viewBtn: { flex: 2, backgroundColor: '#1a73e8', padding: 10, borderRadius: 8, alignItems: 'center' },
  viewBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  unarchiveBtn: { flex: 1, borderWidth: 1, borderColor: '#2e7d32', padding: 10, borderRadius: 8, alignItems: 'center' },
  unarchiveBtnText: { color: '#2e7d32', fontSize: 13 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#aaa' },
  emptyHint: { fontSize: 12, color: '#ccc', marginTop: 8 },
});
