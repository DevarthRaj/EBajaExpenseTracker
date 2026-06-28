// ============================================================
// Summary Screen (Dashboard)
// Uses victory-native v41 API: CartesianChart, Line, PolarChart, Pie
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { CartesianChart, Line, PolarChart, Pie } from 'victory-native';
import { useExpenseStore } from '../store/expenseStore';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { DEPARTMENTS, DEPARTMENT_COLORS, Department } from '../utils/constants';
import { formatCurrency, groupByWeek, lastNWeekLabels } from '../utils/formatters';
import { supabase } from '../lib/supabase';
import { DepartmentLimit } from '../lib/supabaseTypes';

type BreakdownMode = 'department' | 'category' | 'funds';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SummaryScreen() {
  const { expenses, funds, fetchExpenses, fetchFunds } = useExpenseStore();
  const { activeBudget } = useBudgetStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>('department');
  const [deptLimits, setDeptLimits] = useState<DepartmentLimit[]>([]);
  const [limitsModalVisible, setLimitsModalVisible] = useState(false);
  const [limitInputs, setLimitInputs] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeBudget) {
      fetchExpenses(activeBudget.id);
      fetchFunds(activeBudget.id);
      fetchLimits(activeBudget.id);
    }
  }, [activeBudget?.id]);

  const fetchLimits = async (budgetId: string) => {
    const { data } = await supabase
      .from('department_limits')
      .select('*')
      .eq('budget_id', budgetId);
    if (data) {
      setDeptLimits(data as DepartmentLimit[]);
      const inputs: Record<string, string> = {};
      (data as DepartmentLimit[]).forEach((l) => {
        inputs[l.department] = String(l.limit_amount);
      });
      setLimitInputs(inputs);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeBudget) {
      await fetchExpenses(activeBudget.id);
      await fetchFunds(activeBudget.id);
    }
    setRefreshing(false);
  };

  // ─── Computed values ────────────────────────────────────
  const totalFunds = useMemo(
    () => funds.reduce((s, f) => s + f.amount, 0),
    [funds]
  );
  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );
  const balance = totalFunds - totalSpent;
  const billsCount = expenses.filter((e) => e.bill_url).length;
  const contributorsCount = new Set(funds.map((f) => f.contributor_name)).size;

  // Spending velocity (last 6 weeks)
  const weekSums = useMemo(() => groupByWeek(expenses, 6), [expenses]);
  const weekLabels = useMemo(() => lastNWeekLabels(6), []);
  // CartesianChart needs data as array of objects with x and y
  const velocityData = weekSums.map((y, x) => ({ x, y }));

  // Department spend
  const deptSpend = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.department] = (map[e.department] ?? 0) + e.amount;
    });
    return map;
  }, [expenses]);

  // Breakdown pie data
  const breakdownData = useMemo(() => {
    if (breakdownMode === 'department') {
      return DEPARTMENTS.map((d) => ({
        label: d,
        value: deptSpend[d] ?? 0,
        color: DEPARTMENT_COLORS[d as Department],
      })).filter((d) => d.value > 0);
    } else if (breakdownMode === 'category') {
      const catMap: Record<string, number> = {};
      expenses.forEach((e) => {
        catMap[e.category] = (catMap[e.category] ?? 0) + e.amount;
      });
      return Object.entries(catMap).map(([label, value], i) => ({
        label,
        value,
        color: ['#1a73e8','#f97316','#22c55e','#eab308','#a855f7','#ef4444','#14b8a6'][i % 7],
      }));
    } else {
      return funds.map((f, i) => ({
        label: f.contributor_name,
        value: f.amount,
        color: ['#4CAF50','#2196F3','#FF9800','#9C27B0','#F44336'][i % 5],
      }));
    }
  }, [breakdownMode, expenses, funds, deptSpend]);

  const saveLimits = async () => {
    if (!activeBudget) return;
    const upserts = Object.entries(limitInputs)
      .filter(([, v]) => v && parseFloat(v) > 0)
      .map(([department, limit_amount]) => ({
        budget_id: activeBudget.id,
        department,
        limit_amount: parseFloat(limit_amount),
      }));

    const { error } = await supabase
      .from('department_limits')
      .upsert(upserts, { onConflict: 'budget_id,department' });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setLimitsModalVisible(false);
      fetchLimits(activeBudget.id);
    }
  };

  if (!activeBudget) {
    return (
      <View style={styles.center}>
        <Text>No budget selected. Go to Budgets tab to create one.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Budget Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Team Fund Balance</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
        <Text style={styles.balanceSub}>
          {formatCurrency(totalFunds)} collected · {formatCurrency(totalSpent)} spent
        </Text>
      </View>

      {/* Stat Cards */}
      <View style={styles.statsRow}>
        <StatCard label="Transactions" value={String(expenses.length)} />
        <StatCard label="Contributors" value={String(contributorsCount)} />
        <StatCard label="Bills Attached" value={String(billsCount)} />
      </View>

      {/* Spending Velocity — CartesianChart + Line */}
      <Text style={styles.sectionTitle}>Spending Velocity (Last 6 Weeks)</Text>
      {velocityData.some((d) => d.y > 0) ? (
        <View style={{ height: 200, marginHorizontal: 8 }}>
          <CartesianChart
            data={velocityData}
            xKey="x"
            yKeys={['y']}
            axisOptions={{
              tickCount: 6,
              formatXLabel: (v: number) => weekLabels[v] ?? '',
            }}
          >
            {({ points }) => (
              <Line
                points={points.y}
                color="#1a73e8"
                strokeWidth={2}
                animate={{ type: 'timing', duration: 300 }}
              />
            )}
          </CartesianChart>
        </View>
      ) : (
        <Text style={styles.emptyText}>No spending data yet.</Text>
      )}

      {/* Department Spend Bars */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Spending by Department</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => setLimitsModalVisible(true)}>
            <Text style={styles.linkText}>Set Limits</Text>
          </TouchableOpacity>
        )}
      </View>
      {DEPARTMENTS.map((dept) => {
        const spent = deptSpend[dept] ?? 0;
        const limit = deptLimits.find((l) => l.department === dept)?.limit_amount ?? 0;
        const pct = limit > 0 ? Math.min(spent / limit, 1) : 0;
        return (
          <View key={dept} style={styles.deptRow}>
            <Text style={styles.deptName}>{dept}</Text>
            <Text style={styles.deptAmount}>{formatCurrency(spent)}</Text>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${limit > 0 ? pct * 100 : 0}%`,
                    backgroundColor: DEPARTMENT_COLORS[dept as Department],
                  },
                ]}
              />
            </View>
            {limit > 0 && (
              <Text style={[styles.deptLimit, pct >= 1 && { color: 'red' }]}>
                / {formatCurrency(limit)}
              </Text>
            )}
          </View>
        );
      })}

      {/* Breakdown Toggle */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Breakdown</Text>
        <View style={styles.toggleRow}>
          {(['department', 'category', 'funds'] as BreakdownMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setBreakdownMode(m)}
              style={[styles.toggleBtn, breakdownMode === m && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, breakdownMode === m && styles.toggleTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pie chart using PolarChart + Pie */}
      {breakdownData.length > 0 ? (
        <View style={{ height: 260 }}>
          <PolarChart
            data={breakdownData}
            labelKey="label"
            valueKey="value"
            colorKey="color"
          >
            <Pie.Chart innerRadius="50%">
              {({ slice }) => (
                <>
                  <Pie.Slice />
                  <Pie.SliceAngularInset angularInset={{ angularStrokeWidth: 2, angularStrokeColor: '#fff' }} />
                </>
              )}
            </Pie.Chart>
          </PolarChart>
        </View>
      ) : (
        <Text style={styles.emptyText}>No data for this breakdown.</Text>
      )}

      {/* Breakdown legend */}
      {breakdownData.length > 0 && (
        <View style={styles.legend}>
          {breakdownData.map((d) => (
            <View key={d.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: d.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {d.label}: {formatCurrency(d.value)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Set Limits Modal */}
      <Modal visible={limitsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Department Limits</Text>
            <ScrollView>
              {DEPARTMENTS.map((dept) => (
                <View key={dept} style={styles.limitRow}>
                  <Text style={styles.limitLabel}>{dept}</Text>
                  <TextInput
                    style={styles.limitInput}
                    value={limitInputs[dept] ?? ''}
                    onChangeText={(v) =>
                      setLimitInputs((prev) => ({ ...prev, [dept]: v }))
                    }
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setLimitsModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveLimits}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  balanceCard: { padding: 24, alignItems: 'center', backgroundColor: '#f5f5f5', margin: 16, borderRadius: 12 },
  balanceLabel: { fontSize: 14, color: '#666' },
  balanceAmount: { fontSize: 36, fontWeight: '700', marginVertical: 4 },
  balanceSub: { fontSize: 12, color: '#888' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 8 },
  statCard: { alignItems: 'center', padding: 12, flex: 1, margin: 4, backgroundColor: '#f9f9f9', borderRadius: 8 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#666', textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600', paddingHorizontal: 16, marginTop: 16, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 },
  linkText: { color: '#1a73e8', fontSize: 13 },
  deptRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  deptName: { width: 80, fontSize: 12 },
  deptAmount: { width: 80, fontSize: 12, textAlign: 'right' },
  barBg: { flex: 1, height: 8, backgroundColor: '#eee', borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  deptLimit: { fontSize: 11, color: '#888', width: 70 },
  toggleRow: { flexDirection: 'row', marginRight: 16, marginTop: 8 },
  toggleBtn: { paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 16, marginLeft: 4 },
  toggleBtnActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  toggleText: { fontSize: 12, color: '#666' },
  toggleTextActive: { color: '#fff' },
  emptyText: { textAlign: 'center', color: '#aaa', marginVertical: 24 },
  legend: { paddingHorizontal: 16, paddingBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { fontSize: 12, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  limitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  limitLabel: { flex: 1, fontSize: 14 },
  limitInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, width: 100, textAlign: 'right' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 16 },
  cancelText: { color: '#666', fontSize: 15 },
  saveBtn: { backgroundColor: '#1a73e8', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
