// ============================================================
// Pending Screen — Reimbursement pending list
// ============================================================
import React, { useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useExpenseStore } from '../store/expenseStore';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { Expense } from '../lib/supabaseTypes';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useState } from 'react';

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
            <Text style={styles.reimburseBtnText}>Mark Reimbursed</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No pending reimbursements. 🎉</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, backgroundColor: '#fff3e0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerCount: { fontSize: 14, color: '#e65100', fontWeight: '600' },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'flex-start' },
  itemLeft: { flex: 1 },
  itemRight: { alignItems: 'flex-end' },
  desc: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  dept: { fontSize: 11, color: '#666', marginTop: 4 },
  amount: { fontSize: 16, fontWeight: '700', color: '#c62828' },
  reimburseBtn: { marginTop: 8, backgroundColor: '#2e7d32', padding: 8, borderRadius: 6 },
  reimburseBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#aaa', padding: 40, fontSize: 15 },
});
