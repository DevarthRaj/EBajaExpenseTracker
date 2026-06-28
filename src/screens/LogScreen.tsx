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
import { DEPARTMENTS, CATEGORIES, DEPARTMENT_COLORS, Department, THEME } from '../utils/constants';
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
        activeOpacity={0.8}
      >
        {/* Summary row */}
        <View style={styles.expenseSummary}>
          <View style={styles.expenseLeft}>
            <Text style={styles.expenseDesc} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={styles.expenseMeta}>
              <View style={[styles.deptBadge, { backgroundColor: `${deptColor}30`, borderColor: deptColor }]}>
                <Text style={[styles.deptBadgeText, { color: deptColor }]}>{item.department}</Text>
              </View>
              <Text style={styles.expensePaidBy}>{item.paid_by}</Text>
              <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
            </View>
          </View>
          <Text style={styles.expenseAmount}>-{formatCurrency(item.amount)}</Text>
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
                  <Text style={styles.historyBtnText}>History</Text>
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
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
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
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.filterLabel}>To</Text>
              <TextInput
                style={styles.dateInput}
                value={filterTo}
                onChangeText={setFilterTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses found.</Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
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
  container: {
    flex: 1,
    backgroundColor: THEME.colors.deepBg,
  },
  toolbar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
  },
  filterBtn: {
    color: THEME.colors.textBlueLight,
    fontSize: 13,
    fontWeight: '700',
  },
  exportBtn: {
    color: THEME.colors.vibrantGreen,
    fontSize: 13,
    fontWeight: '700',
  },
  filterPanel: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    marginTop: 10,
    marginBottom: 6,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: THEME.colors.vibrantGreen,
    borderColor: THEME.colors.vibrantGreen,
  },
  chipText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    fontSize: 11,
    color: '#000',
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    marginTop: 4,
  },
  resultCount: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 12,
    color: THEME.colors.textBlueLight,
    fontWeight: '500',
  },
  expenseItem: {
    ...THEME.styles.glassCard,
    marginBottom: 10,
    padding: 0,
    overflow: 'hidden',
  },
  expenseSummary: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  expenseLeft: {
    flex: 1,
  },
  expenseDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  deptBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  deptBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  expensePaidBy: {
    fontSize: 11,
    color: THEME.colors.textBlueLight,
  },
  expenseDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textRed,
  },
  expenseDetail: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  detailLabel: {
    width: 110,
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.textWhite,
  },
  billThumb: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  editBtn: {
    flex: 1,
    backgroundColor: THEME.colors.electricBlue,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  historyBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  historyBtnText: {
    color: THEME.colors.textWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: THEME.colors.textRed,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    color: THEME.colors.textMuted,
    padding: 40,
    fontSize: 14,
  },
});
