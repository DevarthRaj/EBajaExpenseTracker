// ============================================================
// Log Screen — Full transaction list with search & filters
// ============================================================
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useExpenseStore } from '../store/expenseStore';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { Expense } from '../lib/supabaseTypes';
import { DEPARTMENTS, CATEGORIES, DEPARTMENT_COLORS, Department } from '../utils/constants';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToExcel } from '../utils/exportExcel';

export default function LogScreen() {
  const navigation = useNavigation<any>();
  const { expenses, funds, fetchExpenses, deleteExpense, loading } = useExpenseStore();
  const { activeBudget } = useBudgetStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeBudget) fetchExpenses(activeBudget.id);
  }, [activeBudget?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeBudget) await fetchExpenses(activeBudget.id);
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const q = search.toLowerCase();
      if (q && !e.description.toLowerCase().includes(q) && !e.paid_by.toLowerCase().includes(q)) return false;
      if (filterDept && e.department !== filterDept) return false;
      if (filterCat && e.category !== filterCat) return false;
      if (filterFrom && e.date < filterFrom) return false;
      if (filterTo && e.date > filterTo) return false;
      return true;
    });
  }, [expenses, search, filterDept, filterCat, filterFrom, filterTo]);

  const handleDelete = (expense: Expense) => {
    Alert.alert('Delete Expense', `Delete "${expense.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteExpense(expense.id),
      },
    ]);
  };

  const handleEdit = (expense: Expense) => {
    navigation.navigate('EditExpense', { expense });
  };

  const handleViewHistory = (expense: Expense) => {
    navigation.navigate('ExpenseHistory', {
      expenseId: expense.id,
      description: expense.description,
    });
  };

  const handleExport = async () => {
    if (!activeBudget) return;
    await exportToExcel({ expenses, funds, budgetName: activeBudget.name });
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const isExpanded = expandedId === item.id;
    const deptColor = DEPARTMENT_COLORS[item.department as Department] ?? '#888';

    return (
      <TouchableOpacity
        style={styles.expenseItem}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        {/* Summary row */}
        <View style={styles.expenseSummary}>
          <View style={styles.expenseLeft}>
            <Text style={styles.expenseDesc} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={styles.expenseMeta}>
              <View style={[styles.deptBadge, { backgroundColor: deptColor }]}>
                <Text style={styles.deptBadgeText}>{item.department}</Text>
              </View>
              <Text style={styles.expensePaidBy}>{item.paid_by}</Text>
              <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
            </View>
          </View>
          <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
        </View>

        {/* Expanded details */}
        {isExpanded && (
          <View style={styles.expenseDetail}>
            <DetailRow label="Category" value={item.category} />
            <DetailRow label="Payment Mode" value={item.payment_mode} />
            {item.notes ? <DetailRow label="Notes" value={item.notes} /> : null}
            <DetailRow
              label="Reimbursement"
              value={
                item.is_reimbursed
                  ? '✓ Reimbursed'
                  : item.is_reimbursement_pending
                  ? '⏳ Pending'
                  : 'N/A'
              }
            />
            {item.bill_url ? (
              <Image
                source={{ uri: item.bill_url }}
                style={styles.billThumb}
                resizeMode="cover"
              />
            ) : null}

            {/* Admin actions */}
            {isAdmin && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleEdit(item)}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.historyBtn}
                  onPress={() => handleViewHistory(item)}
                >
                  <Text style={styles.historyBtnText}>Edit History</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search + filter toolbar */}
      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search description or paid by…"
          clearButtonMode="while-editing"
        />
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <Text style={styles.filterBtn}>⚙ Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleExport}>
          <Text style={styles.exportBtn}>↓ XLSX</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Department</Text>
          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[styles.chip, filterDept === '' && styles.chipActive]}
              onPress={() => setFilterDept('')}
            >
              <Text style={filterDept === '' ? styles.chipTextActive : styles.chipText}>All</Text>
            </TouchableOpacity>
            {DEPARTMENTS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, filterDept === d && styles.chipActive]}
                onPress={() => setFilterDept(filterDept === d ? '' : d)}
              >
                <Text style={filterDept === d ? styles.chipTextActive : styles.chipText}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[styles.chip, filterCat === '' && styles.chipActive]}
              onPress={() => setFilterCat('')}
            >
              <Text style={filterCat === '' ? styles.chipTextActive : styles.chipText}>All</Text>
            </TouchableOpacity>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, filterCat === c && styles.chipActive]}
                onPress={() => setFilterCat(filterCat === c ? '' : c)}
              >
                <Text style={filterCat === c ? styles.chipTextActive : styles.chipText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>From</Text>
              <TextInput
                style={styles.dateInput}
                value={filterFrom}
                onChangeText={setFilterFrom}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.filterLabel}>To</Text>
              <TextInput
                style={styles.dateInput}
                value={filterTo}
                onChangeText={setFilterTo}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
        </View>
      )}

      <Text style={styles.resultCount}>{filtered.length} transactions</Text>

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        renderItem={renderExpense}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses found.</Text>
        }
      />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  toolbar: { flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, fontSize: 13 },
  filterBtn: { color: '#1a73e8', fontSize: 13, fontWeight: '600' },
  exportBtn: { color: '#2e7d32', fontSize: 13, fontWeight: '600' },
  filterPanel: { padding: 12, backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginTop: 8, marginBottom: 4 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 14 },
  chipActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  chipText: { fontSize: 12, color: '#555' },
  chipTextActive: { fontSize: 12, color: '#fff' },
  dateRow: { flexDirection: 'row', marginTop: 4 },
  dateInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, fontSize: 12, marginTop: 4 },
  resultCount: { paddingHorizontal: 16, paddingVertical: 6, fontSize: 12, color: '#888' },
  expenseItem: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  expenseSummary: { flexDirection: 'row', padding: 14, alignItems: 'center' },
  expenseLeft: { flex: 1 },
  expenseDesc: { fontSize: 14, fontWeight: '600' },
  expenseMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  deptBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8 },
  deptBadgeText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  expensePaidBy: { fontSize: 11, color: '#888' },
  expenseDate: { fontSize: 11, color: '#aaa' },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: '#c62828' },
  expenseDetail: { paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#fafafa' },
  detailRow: { flexDirection: 'row', marginTop: 6 },
  detailLabel: { width: 110, fontSize: 12, color: '#888' },
  detailValue: { flex: 1, fontSize: 12 },
  billThumb: { width: '100%', height: 150, borderRadius: 8, marginTop: 10 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn: { flex: 1, backgroundColor: '#1a73e8', padding: 8, borderRadius: 6, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  historyBtn: { flex: 1, borderWidth: 1, borderColor: '#666', padding: 8, borderRadius: 6, alignItems: 'center' },
  historyBtnText: { color: '#666', fontSize: 13 },
  deleteBtn: { flex: 1, backgroundColor: '#c62828', padding: 8, borderRadius: 6, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#aaa', padding: 40 },
});
