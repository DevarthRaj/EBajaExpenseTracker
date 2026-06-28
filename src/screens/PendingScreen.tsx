// ============================================================
// Pending Screen — Reimbursement pending list
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useExpenseStore } from '../store/expenseStore';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { Expense } from '../lib/supabaseTypes';
import { formatCurrency, formatDate } from '../utils/formatters';
import { THEME } from '../utils/constants';

export default function PendingScreen() {
  const { expenses, fetchExpenses, markReimbursed } = useExpenseStore();
  const { activeBudget } = useBudgetStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeBudget) fetchExpenses(activeBudget.id);
  }, [activeBudget?.id]);

  const pending = expenses.filter((e) => e.is_reimbursement_pending && !e.is_reimbursed);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeBudget) await fetchExpenses(activeBudget.id);
    setRefreshing(false);
  };

  const handleMarkReimbursed = (expense: Expense) => {
    Alert.alert(
      'Mark as Reimbursed',
      `Mark "${expense.description}" (${formatCurrency(expense.amount)}) as reimbursed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => markReimbursed(expense.id) },
      ]
    );
  };

  const renderItem = ({ item }: { item: Expense }) => (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.meta}>
          {item.paid_by} · {formatDate(item.date)}
        </Text>
        <Text style={styles.dept}>{item.department}</Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.reimburseBtn}
            onPress={() => handleMarkReimbursed(item)}
          >
            <Text style={styles.reimburseBtnText}>Reimburse</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pending Reimbursements</Text>
        <Text style={styles.headerCount}>{pending.length} items</Text>
      </View>
      <FlatList
        data={pending}
        keyExtractor={(e) => e.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <Text style={styles.empty}>No pending reimbursements. 🎉</Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.deepBg,
  },
  header: {
    padding: 16,
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 152, 0, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFB74D',
  },
  headerCount: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '700',
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  item: {
    ...THEME.styles.glassCard,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  itemLeft: {
    flex: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  desc: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  meta: {
    fontSize: 12,
    color: THEME.colors.textBlueLight,
    marginTop: 4,
  },
  dept: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textRed,
    marginBottom: 8,
  },
  reimburseBtn: {
    backgroundColor: THEME.colors.vibrantGreen,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  reimburseBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    color: THEME.colors.textMuted,
    padding: 40,
    fontSize: 14,
  },
});
