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
import { THEME } from '../utils/constants';

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

  const handleViewOrEdit = (budget: Budget) => {
    setActiveBudget(budget);
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
              <Text style={styles.statLbl}>Spent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>₹{stats.total_funds.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLbl}>Funds</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
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
  container: {
    flex: 1,
    backgroundColor: THEME.colors.deepBg,
  },
  budgetCard: {
    ...THEME.styles.glassCard,
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetName: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    flex: 1,
  },
  archivedBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.2)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  archivedText: {
    fontSize: 10,
    color: '#FFB74D',
    fontWeight: '700',
  },
  budgetYear: {
    fontSize: 13,
    color: THEME.colors.textBlueLight,
    marginTop: 6,
  },
  budgetDate: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    padding: 8,
    borderRadius: 12,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  statLbl: {
    fontSize: 10,
    color: THEME.colors.textBlueLight,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  viewBtn: {
    flex: 2,
    backgroundColor: THEME.colors.electricBlue,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  unarchiveBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.vibrantGreen,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(22, 224, 76, 0.05)',
  },
  unarchiveBtnText: {
    color: THEME.colors.vibrantGreen,
    fontSize: 13,
    fontWeight: '700',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: THEME.colors.textMuted,
  },
  emptyHint: {
    fontSize: 12,
    color: THEME.colors.textBlueLight,
    marginTop: 8,
    textAlign: 'center',
  },
});
