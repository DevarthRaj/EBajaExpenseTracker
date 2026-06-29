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
import { DEPARTMENT_COLORS, Department, THEME } from '../utils/constants';
import { formatCurrency, groupByWeek, lastNWeekLabels } from '../utils/formatters';
import { supabase } from '../lib/supabase';
import { DepartmentLimit } from '../lib/supabaseTypes';

type BreakdownMode = 'department' | 'category' | 'funds';

export default function SummaryScreen() {
  const { expenses, funds, departments, fetchExpenses, fetchFunds, fetchConfig } = useExpenseStore();
  const { activeBudget } = useBudgetStore();
  const { role, user } = useAuthStore();
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
      fetchConfig();
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
      return departments.map((d) => ({
        label: d,
        value: deptSpend[d] ?? 0,
        color: DEPARTMENT_COLORS[d as Department] ?? '#1649E0',
      })).filter((d) => d.value > 0);
    } else if (breakdownMode === 'category') {
      const catMap: Record<string, number> = {};
      expenses.forEach((e) => {
        catMap[e.category] = (catMap[e.category] ?? 0) + e.amount;
      });
      return Object.entries(catMap).map(([label, value], i) => ({
        label,
        value,
        color: ['#1649E0','#f97316','#22c55e','#eab308','#a855f7','#ef4444','#14b8a6'][i % 7],
      }));
    } else {
      return funds.map((f, i) => ({
        label: f.contributor_name,
        value: f.amount,
        color: ['#16E04C','#2196F3','#FF9800','#9C27B0','#F44336'][i % 5],
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
        <Text style={styles.emptyText}>No budget selected. Go to Budgets tab to create one.</Text>
      </View>
    );
  }

  // Welcome message based on local time
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning! ☀️';
    if (hrs < 18) return 'Good afternoon! 🌤️';
    return 'Good evening! 👋';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      {/* Welcome Top Header */}
      <View style={styles.userHeader}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.name ?? 'Alex Kim'}</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(user?.name ?? 'A').charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Budget Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
        
        <View style={styles.pillsRow}>
          {/* Income Pill */}
          <View style={styles.pill}>
            <View style={[styles.pillIconBg, { backgroundColor: 'rgba(22, 224, 76, 0.2)' }]}>
              <Text style={{ color: THEME.colors.vibrantGreen, fontSize: 10 }}>↓</Text>
            </View>
            <View>
              <Text style={styles.pillTitle}>COLLECTED</Text>
              <Text style={styles.pillValue}>{formatCurrency(totalFunds)}</Text>
            </View>
          </View>
          
          {/* Expenses Pill */}
          <View style={styles.pill}>
            <View style={[styles.pillIconBg, { backgroundColor: 'rgba(248, 113, 113, 0.2)' }]}>
              <Text style={{ color: THEME.colors.textRed, fontSize: 10 }}>↑</Text>
            </View>
            <View>
              <Text style={styles.pillTitle}>SPENT</Text>
              <Text style={styles.pillValue}>{formatCurrency(totalSpent)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stat Cards */}
      <View style={styles.statsRow}>
        <StatCard label="Transactions" value={String(expenses.length)} />
        <StatCard label="Contributors" value={String(contributorsCount)} />
        <StatCard label="Bills Attached" value={String(billsCount)} />
      </View>

      {/* Spending Velocity */}
      <Text style={styles.sectionTitle}>Spending Velocity (Last 6 Weeks)</Text>
      {velocityData.some((d) => d.y > 0) ? (
        <View style={styles.chartCard}>
          <View style={{ height: 160 }}>
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
                  color={THEME.colors.vibrantGreen}
                  strokeWidth={2}
                  animate={{ type: 'timing', duration: 300 }}
                />
              )}
            </CartesianChart>
          </View>
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
      
      <View style={styles.deptCardContainer}>
        {departments.map((dept) => {
          const spent = deptSpend[dept] ?? 0;
          const limit = deptLimits.find((l) => l.department === dept)?.limit_amount ?? 0;
          const pct = limit > 0 ? Math.min(spent / limit, 1) : 0;
          return (
            <View key={dept} style={styles.deptRow}>
              <View style={styles.deptInfoRow}>
                <Text style={styles.deptName}>{dept}</Text>
                <View style={styles.deptRightAlign}>
                  <Text style={styles.deptAmount}>{formatCurrency(spent)}</Text>
                  {limit > 0 && (
                    <Text style={[styles.deptLimit, pct >= 1 && { color: THEME.colors.textRed }]}>
                      / {formatCurrency(limit)}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${limit > 0 ? pct * 100 : 0}%`,
                      backgroundColor: DEPARTMENT_COLORS[dept as Department] ?? '#1649E0',
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

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
        <View style={styles.breakdownCard}>
          <View style={{ height: 200 }}>
            <PolarChart
              data={breakdownData}
              labelKey="label"
              valueKey="value"
              colorKey="color"
            >
              <Pie.Chart innerRadius="60%">
                {({ slice }) => (
                  <>
                    <Pie.Slice />
                    <Pie.SliceAngularInset angularInset={{ angularStrokeWidth: 2, angularStrokeColor: THEME.colors.deepBg }} />
                  </>
                )}
              </Pie.Chart>
            </PolarChart>
          </View>
          
          {/* Breakdown legend */}
          <View style={styles.legendContainer}>
            {breakdownData.map((d) => (
              <View key={d.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {d.label}: <Text style={{ color: '#fff', fontWeight: '700' }}>{formatCurrency(d.value)}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>No data for this breakdown.</Text>
      )}

      {/* Set Limits Modal */}
      <Modal visible={limitsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Department Limits</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {departments.map((dept) => (
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
                    placeholderTextColor="rgba(255,255,255,0.3)"
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

      <View style={{ height: 40 }} />
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
  container: {
    flex: 1,
    backgroundColor: THEME.colors.deepBg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: THEME.colors.deepBg,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 13,
    color: THEME.colors.textBlueLight,
    fontWeight: '300',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.glassBg,
    borderWidth: 1,
    borderColor: 'rgba(22, 224, 76, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: THEME.colors.vibrantGreen,
    fontWeight: '700',
    fontSize: 16,
  },
  balanceCard: {
    ...THEME.styles.glassCard,
    ...THEME.styles.electricGlow,
    margin: 16,
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    marginBottom: 20,
    letterSpacing: -1,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  pill: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTitle: {
    fontSize: 8,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pillValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statCard: {
    ...THEME.styles.glassCard,
    alignItems: 'center',
    padding: 12,
    flex: 1,
    margin: 4,
    borderRadius: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  statLabel: {
    fontSize: 10,
    color: THEME.colors.textBlueLight,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 18,
    marginTop: 20,
    marginBottom: 8,
    color: THEME.colors.textWhite,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 18,
  },
  linkText: {
    color: THEME.colors.vibrantGreen,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  chartCard: {
    ...THEME.styles.glassCard,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  deptCardContainer: {
    ...THEME.styles.glassCard,
    marginHorizontal: 16,
    padding: 20,
    gap: 16,
  },
  deptRow: {
    width: '100%',
  },
  deptInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  deptName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textWhite,
  },
  deptRightAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deptAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  deptLimit: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  barBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  toggleRow: {
    flexDirection: 'row',
    marginRight: 16,
    marginTop: 12,
  },
  toggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    marginLeft: 4,
  },
  toggleBtnActive: {
    backgroundColor: THEME.colors.vibrantGreen,
    borderColor: THEME.colors.vibrantGreen,
  },
  toggleText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  breakdownCard: {
    ...THEME.styles.glassCard,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 10,
    color: THEME.colors.textBlueLight,
  },
  emptyText: {
    textAlign: 'center',
    color: THEME.colors.textMuted,
    marginVertical: 24,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: THEME.colors.deepBg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    marginBottom: 20,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  limitLabel: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.textWhite,
  },
  limitInput: {
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: THEME.colors.textWhite,
    borderRadius: 8,
    padding: 8,
    width: 100,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: THEME.colors.textMuted,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: THEME.colors.vibrantGreen,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '700',
  },
});
