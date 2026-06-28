// ============================================================
// Analytics Screen
// Uses victory-native v41 API: CartesianChart, Bar, PolarChart, Pie
// ============================================================
import React, { useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { CartesianChart, Bar, PolarChart, Pie } from 'victory-native';
import { useExpenseStore } from '../store/expenseStore';
import { useBudgetStore } from '../store/budgetStore';
import { DEPARTMENTS, DEPARTMENT_COLORS, Department } from '../utils/constants';
import { formatCurrency, groupByMonth } from '../utils/formatters';
import { useState } from 'react';

export default function AnalyticsScreen() {
  const { expenses, fetchExpenses } = useExpenseStore();
  const { activeBudget } = useBudgetStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeBudget) fetchExpenses(activeBudget.id);
  }, [activeBudget?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeBudget) await fetchExpenses(activeBudget.id);
    setRefreshing(false);
  };

  // Monthly spend (last 6 months) — CartesianChart expects numeric x
  const monthlyRaw = useMemo(() => groupByMonth(expenses, 6), [expenses]);
  const monthlyData = monthlyRaw.map((d, i) => ({ x: i, y: d.value, label: d.label }));
  const monthLabels = monthlyRaw.map((d) => d.label);

  // Category breakdown for pie
  const catData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([label, value], i) => ({
        label,
        value,
        color: ['#1a73e8','#f97316','#22c55e','#eab308','#a855f7','#ef4444','#14b8a6'][i % 7],
      }));
  }, [expenses]);

  // Department comparison for bar chart
  const deptData = useMemo(() => {
    return DEPARTMENTS.map((d, i) => ({
      x: i,
      y: expenses.filter((e) => e.department === d).reduce((s, e) => s + e.amount, 0),
      dept: d,
    }));
  }, [expenses]);

  // Top spenders
  const topSpenders = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.paid_by] = (map[e.paid_by] ?? 0) + e.amount;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [expenses]);

  if (!activeBudget) {
    return (
      <View style={styles.center}>
        <Text>No budget selected.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Monthly Spend Bar Chart */}
      <Text style={styles.sectionTitle}>Monthly Spend (Last 6 Months)</Text>
      {monthlyData.some((d) => d.y > 0) ? (
        <View style={{ height: 220, marginHorizontal: 8 }}>
          <CartesianChart
            data={monthlyData}
            xKey="x"
            yKeys={['y']}
            axisOptions={{
              tickCount: 6,
              formatXLabel: (v: number) => monthLabels[v] ?? '',
            }}
          >
            {({ points, chartBounds }) => (
              <Bar
                points={points.y}
                chartBounds={chartBounds}
                color="#1a73e8"
                roundedCorners={{ topLeft: 4, topRight: 4 }}
              />
            )}
          </CartesianChart>
        </View>
      ) : (
        <Text style={styles.empty}>No expense data yet.</Text>
      )}

      {/* Category Pie */}
      <Text style={styles.sectionTitle}>Spend by Category</Text>
      {catData.length > 0 ? (
        <>
          <View style={{ height: 220 }}>
            <PolarChart
              data={catData}
              labelKey="label"
              valueKey="value"
              colorKey="color"
            >
              <Pie.Chart innerRadius="40%">
                {() => (
                  <>
                    <Pie.Slice />
                    <Pie.SliceAngularInset angularInset={{ angularStrokeWidth: 2, angularStrokeColor: '#fff' }} />
                  </>
                )}
              </Pie.Chart>
            </PolarChart>
          </View>
          <View style={styles.legend}>
            {catData.map((d) => (
              <View key={d.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                <Text style={styles.legendLabel}>{d.label}: {formatCurrency(d.value)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.empty}>No data.</Text>
      )}

      {/* Department Comparison Bar Chart */}
      <Text style={styles.sectionTitle}>Department Comparison</Text>
      {deptData.some((d) => d.y > 0) ? (
        <View style={{ height: 220, marginHorizontal: 8 }}>
          <CartesianChart
            data={deptData}
            xKey="x"
            yKeys={['y']}
            axisOptions={{
              tickCount: DEPARTMENTS.length,
              formatXLabel: (v: number) => DEPARTMENTS[v]?.slice(0, 4) ?? '',
            }}
          >
            {({ points, chartBounds }) => (
              <Bar
                points={points.y}
                chartBounds={chartBounds}
                color="#4CAF50"
                roundedCorners={{ topLeft: 4, topRight: 4 }}
              />
            )}
          </CartesianChart>
        </View>
      ) : (
        <Text style={styles.empty}>No data.</Text>
      )}

      {/* Dept color legend */}
      <View style={styles.legend}>
        {DEPARTMENTS.map((d) => (
          <View key={d} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DEPARTMENT_COLORS[d as Department] }]} />
            <Text style={styles.legendLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Top Spenders */}
      <Text style={styles.sectionTitle}>Top Spenders</Text>
      {topSpenders.length === 0 ? (
        <Text style={styles.empty}>No expenses yet.</Text>
      ) : (
        topSpenders.map(([name, amount], i) => (
          <View key={name} style={styles.spenderRow}>
            <Text style={styles.spenderRank}>#{i + 1}</Text>
            <Text style={styles.spenderName}>{name}</Text>
            <Text style={styles.spenderAmount}>{formatCurrency(amount)}</Text>
          </View>
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600', paddingHorizontal: 16, marginTop: 20, marginBottom: 4 },
  empty: { color: '#aaa', textAlign: 'center', padding: 20 },
  legend: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: '#555' },
  spenderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  spenderRank: { width: 30, fontSize: 14, color: '#888' },
  spenderName: { flex: 1, fontSize: 14, fontWeight: '600' },
  spenderAmount: { fontSize: 14, fontWeight: '700', color: '#c62828' },
});
